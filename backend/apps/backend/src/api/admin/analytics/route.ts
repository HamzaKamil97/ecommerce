import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// GET /admin/analytics?tenant_id=...&days=30
//   Returns aggregated metrics — orders, revenue, top products, AOV.

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const tenantId = req.query.tenant_id ? String(req.query.tenant_id) : null
  const days = Math.min(365, Number(req.query.days ?? 30))
  const since = new Date(Date.now() - days * 24 * 3600 * 1000)

  let salesChannelId: string | null = null
  if (tenantId) {
    try {
      const tenantSvc = req.scope.resolve("tenant") as any
      const tenant = await tenantSvc.retrieveTenant(tenantId)
      salesChannelId = tenant?.sales_channel_id ?? null
    } catch {}
  }

  const orderModule = req.scope.resolve("order") as any
  const filter: any = { created_at: { $gte: since } }
  if (salesChannelId) filter.sales_channel_id = salesChannelId
  const orders = await orderModule
    .listOrders(filter, { take: 1000, relations: ["items"] })
    .catch(() => [])

  const totalOrders = orders.length
  const totalRevenue = orders.reduce((s: number, o: any) => s + (o.total ?? 0), 0)
  const aov = totalOrders ? totalRevenue / totalOrders : 0

  // Top products
  const productCounts = new Map<string, { id: string; title: string; qty: number; revenue: number }>()
  for (const o of orders) {
    for (const item of o.items ?? []) {
      const key = item.product_id ?? item.id
      const cur = productCounts.get(key) ?? {
        id: key,
        title: item.product_title ?? item.title ?? "Unknown",
        qty: 0,
        revenue: 0,
      }
      cur.qty += item.quantity ?? 1
      cur.revenue += (item.unit_price ?? 0) * (item.quantity ?? 1)
      productCounts.set(key, cur)
    }
  }
  const topProducts = Array.from(productCounts.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10)

  // Orders per day for sparkline
  const byDay = new Map<string, number>()
  for (const o of orders) {
    const day = new Date(o.created_at).toISOString().slice(0, 10)
    byDay.set(day, (byDay.get(day) ?? 0) + 1)
  }
  const series = Array.from(byDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }))

  res.json({
    tenant_id: tenantId,
    sales_channel_id: salesChannelId,
    days,
    metrics: {
      total_orders: totalOrders,
      total_revenue_cents: totalRevenue,
      average_order_value_cents: Math.round(aov),
    },
    top_products: topProducts,
    orders_per_day: series,
  })
}
