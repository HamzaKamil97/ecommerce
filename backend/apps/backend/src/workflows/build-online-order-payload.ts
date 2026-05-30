import type { CreateOnlineOrderInput } from "../modules/online_order/types"

export interface PayloadShop { id: string; commission_rate_bps?: number | null }
export interface PayloadLine { variant_id: string; title?: string | null; quantity: number; unit_price: number }
export interface PayloadCtx {
  customer_id?: string | null
  customer_name?: string | null
  customer_phone?: string | null
  currency_code: "iqd" | "usd"
  medusa_order_id: string
  display_id?: string | null
  delivery_address?: string | null
  delivery_lat?: number | null
  delivery_lng?: number | null
}

const DEFAULT_COMMISSION_BPS = 700

// IQD `_minor` columns are whole dinars (no fractional minor units in this codebase).
export function buildOnlineOrderPayload(
  shop: PayloadShop,
  lines: PayloadLine[],
  ctx: PayloadCtx,
): CreateOnlineOrderInput {
  // aisle_hint is intentionally NOT set here: it's a picker/WMS concern populated
  // downstream during fulfilment, and is unknown at the moment a customer places.
  const mapped = lines.map((l) => {
    const unit = Math.round(l.unit_price)
    return {
      variant_id: l.variant_id,
      title: l.title ?? "Item",
      qty: l.quantity,
      unit_price_minor: unit,
      line_total_minor: unit * l.quantity,
    }
  })
  const total_minor = mapped.reduce((s, l) => s + l.line_total_minor, 0)
  const bps = shop.commission_rate_bps ?? DEFAULT_COMMISSION_BPS
  const commission_minor = Math.round((total_minor * bps) / 10000)

  return {
    vendor_id: shop.id,
    customer_id: ctx.customer_id ?? null,
    customer_name: ctx.customer_name ?? null,
    customer_phone: ctx.customer_phone ?? null,
    total_minor,
    currency_code: ctx.currency_code,
    commission_rate_bps_snapshot: bps,
    commission_minor,
    medusa_order_id: ctx.medusa_order_id,
    display_id: ctx.display_id ?? null,
    delivery_address: ctx.delivery_address ?? null,
    delivery_lat: ctx.delivery_lat ?? null,
    delivery_lng: ctx.delivery_lng ?? null,
    lines: mapped,
  }
}
