import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveVendorContext } from "../_helpers"

// GET /vendor/analytics?days=30   → analytics scoped to this vendor's tenant

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const ctx = await resolveVendorContext(req, res)
  if (!ctx) return

  const days = Math.min(365, Number(req.query.days ?? 30))
  const since = new Date(Date.now() - days * 24 * 3600 * 1000)

  if (!ctx.tenant.sales_channel_id) {
    return res.json({ metrics: { total_orders: 0, total_revenue_cents: 0, average_order_value_cents: 0 } })
  }

  const orderModule = req.scope.resolve("order") as any
  const orders = await orderModule
    .listOrders(
      { sales_channel_id: ctx.tenant.sales_channel_id, created_at: { $gte: since } },
      { take: 1000, relations: ["items"] }
    )
    .catch(() => [])

  const totalOrders = orders.length
  const totalRevenue = orders.reduce((s: number, o: any) => s + (o.total ?? 0), 0)
  const aov = totalOrders ? totalRevenue / totalOrders : 0

  // Status breakdown
  const byStatus: Record<string, number> = {}
  for (const o of orders) {
    byStatus[o.status] = (byStatus[o.status] ?? 0) + 1
  }

  res.json({
    days,
    metrics: {
      total_orders: totalOrders,
      total_revenue_cents: totalRevenue,
      average_order_value_cents: Math.round(aov),
    },
    by_status: byStatus,
  })
}
