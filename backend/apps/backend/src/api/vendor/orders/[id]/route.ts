import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveVendorContext } from "../../_helpers"

// GET /vendor/orders/:id   fetch a single order (must belong to this vendor's sales channel)

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const ctx = await resolveVendorContext(req, res)
  if (!ctx) return

  const { id } = req.params as { id: string }

  if (!ctx.tenant.sales_channel_id) {
    return res.status(404).json({ error: "Order not found" })
  }

  const orderModule = req.scope.resolve("order") as any
  const [order] = await orderModule.listOrders(
    { id, sales_channel_id: ctx.tenant.sales_channel_id },
    { take: 1, relations: ["items", "customer", "shipping_address"] }
  )

  if (!order) {
    return res.status(404).json({ error: "Order not found" })
  }

  res.json({ order })
}
