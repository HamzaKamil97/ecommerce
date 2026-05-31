import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

// Customer-scoped read of the linked online_order's fulfillment status,
// keyed by the customer's Medusa order id (returned by place-cod).
// Flat path used (not nested under /store/orders/[id]/...) to avoid
// potential collisions with Medusa's core /store/orders/:id route handler.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const ctx = (req as any).auth_context;
  if (ctx?.actor_type !== 'customer') {
    return res.status(401).json({ error: 'Customer authentication required' });
  }
  const customerId = ctx.actor_id;
  const medusaOrderId = (req.params as any).id;

  const svc: any = req.scope.resolve('onlineOrderService');
  const oo = await svc.getByMedusaOrderId(medusaOrderId);
  if (!oo) return res.status(404).json({ error: 'order not found' });
  if (oo.customer_id && oo.customer_id !== customerId) {
    return res.status(404).json({ error: 'order not found' }); // don't leak existence
  }

  res.json({
    status: oo.status,
    display_id: oo.display_id,
    accepted_at: oo.accepted_at,
    delivered_at: oo.delivered_at,
    rejected_at: oo.rejected_at,
  });
}
