import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { placeCodOrderWorkflow } from "../../../../workflows/place-cod-order"

function getCustomerId(req: MedusaRequest): string | null {
  const ctx = (req as any).auth_context
  if (ctx?.actor_type !== "customer") return null
  return ctx.actor_id ?? null
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) return res.status(401).json({ error: "Customer authentication required" })

  const body = (req.body as any) || {}
  if (!body.shop_slug) return res.status(400).json({ error: "shop_slug required" })
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return res.status(400).json({ error: "items must be non-empty array" })
  }

  try {
    const { result } = await placeCodOrderWorkflow(req.scope).run({
      input: {
        customer_id: customerId,
        shop_slug: body.shop_slug,
        address_id: body.address_id ?? null,
        inline_address: body.inline_address ?? null,
        items: body.items,
        shop_notes: body.shop_notes ?? "",
        delivery_notes: body.delivery_notes ?? "",
        coupon_code: body.coupon_code ?? null,
        currency_code: body.currency_code ?? "iqd",
      },
    })
    res.json({ order_id: result.order_id, display_id: result.display_id })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
}
