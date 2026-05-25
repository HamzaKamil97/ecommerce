import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve("posTerminalService")
  const body = (req.body ?? {}) as any
  const required = [
    "client_id", "vendor_id", "cashier_id", "terminal_id",
    "lines", "paid_amount_minor", "currency_code", "client_created_at",
  ]
  for (const k of required) {
    if (body[k] == null) return res.status(400).json({ error: `${k} required` })
  }
  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return res.status(400).json({ error: "lines must be non-empty array" })
  }
  try {
    const sale = await svc.recordSale(body)
    res.json({ sale })
  } catch (e: any) {
    // WmsInsufficientStockError has no .code property — detect by name
    const isInsufficient =
      e?.code === "WMS_INSUFFICIENT_STOCK" ||
      e?.name === "WmsInsufficientStockError"
    const status = isInsufficient ? 409 : 400
    res.status(status).json({ error: e?.message ?? "sale failed", code: e?.code ?? e?.name ?? "SALE_FAILED" })
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve("posTerminalService")
  const vendor_id = req.query.vendor_id as string | undefined
  const limit = Number(req.query.limit ?? 50)
  const offset = Number(req.query.offset ?? 0)
  if (!vendor_id) return res.status(400).json({ error: "vendor_id required" })
  const [rows, count] = await svc.listAndCountSales(
    { vendor_id }, { take: limit, skip: offset, order: { created_at: "DESC" } },
  )
  res.json({ sales: rows, count })
}
