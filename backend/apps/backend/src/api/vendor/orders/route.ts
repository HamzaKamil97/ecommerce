import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveVendorContext } from "../_helpers"

// GET /vendor/orders    list orders that contain products from this vendor's sales channel

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const ctx = await resolveVendorContext(req, res)
  if (!ctx) return
  if (!ctx.tenant.sales_channel_id) {
    return res.json({ orders: [], count: 0 })
  }
  const orderModule = req.scope.resolve("order") as any
  const orders = await orderModule.listOrders(
    { sales_channel_id: ctx.tenant.sales_channel_id },
    { take: 100, relations: ["items", "customer"] }
  )
  res.json({ orders, count: orders.length })
}
