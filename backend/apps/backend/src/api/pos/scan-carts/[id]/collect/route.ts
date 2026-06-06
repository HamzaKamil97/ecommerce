import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve('scanCartService');
  const pos: any = req.scope.resolve('posTerminalService');

  const id = (req.params as any).id;
  const {
    cashier_id,
    terminal_id,
    priced_lines,
    paid_amount_minor,
  } = req.body as {
    cashier_id: string;
    terminal_id: string;
    priced_lines?: Array<{ line_id: string; unit_price_minor: number }>;
    paid_amount_minor: number;
  };

  // Validate the money inputs up front.
  if (!cashier_id || !terminal_id) {
    return res.status(400).json({ error: 'cashier_id and terminal_id are required' });
  }
  if (typeof paid_amount_minor !== 'number' || paid_amount_minor < 0) {
    return res.status(400).json({ error: 'paid_amount_minor must be a non-negative number' });
  }

  // Load cart
  let full = await svc.getWithLines(id);
  if (!full) {
    return res.status(404).json({ error: 'cart not found' });
  }

  // Set audit context so middleware can attribute movements to this vendor
  (req as any).audit_context = { vendor_id: full.vendor_id };

  // Guard: must be PENDING_CASHIER
  if (full.status !== 'PENDING_CASHIER') {
    return res.status(409).json({ error: `cart is ${full.status}` });
  }

  // Price any weigh-at-counter lines supplied by the caller. Only weigh lines are
  // repriceable; a foreign/fixed-price line_id is a bad request, not a server error.
  for (const p of (priced_lines ?? [])) {
    try {
      await svc.priceLine(id, p.line_id, p.unit_price_minor);
    } catch (e: any) {
      if (/fixed-price|not in cart/i.test(e?.message ?? '')) {
        return res.status(400).json({ error: e.message });
      }
      throw e;
    }
  }

  // Reload so we have the freshly-priced values
  full = await svc.getWithLines(id);

  // Guard: every line must be priced before we can finalise
  if (full.lines.some((l: any) => !l.priced)) {
    return res.status(400).json({ error: 'unpriced lines remain' });
  }

  // Build recordSale input. BigNumber columns deserialize as { numeric, value } wrappers,
  // NOT plain numbers — Number(wrapper) is NaN. Read `.numeric` first (same idiom as wms.getStock).
  const toMinor = (v: any): number => Number(v?.numeric ?? v?.value ?? v ?? 0);
  const saleInput = {
    client_id: full.id,
    vendor_id: full.vendor_id,
    cashier_id,
    terminal_id,
    currency_code: 'iqd',
    client_created_at: new Date().toISOString(),
    paid_amount_minor,
    lines: full.lines.map((l: any) => ({
      variant_id: l.variant_id,
      qty: l.qty,
      unit_price_minor: toMinor(l.unit_price_minor),
      name_snapshot: l.title,
    })),
  };

  let result: any;
  try {
    result = await pos.recordSale(saleInput);
  } catch (e: any) {
    // WmsInsufficientStockError → 409 (insufficient stock at collection time)
    if (e?.name === 'WmsInsufficientStockError') {
      return res.status(409).json({ error: e.message });
    }
    throw e;
  }

  // Mark cart as PAID and store the sale reference
  const updated = await svc.transition(id, 'PAID', { paid_sale_id: result.sale_id });

  return res.json({ cart: updated, sale: result });
}
