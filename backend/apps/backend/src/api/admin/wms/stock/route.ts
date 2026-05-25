import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// GET  /admin/wms/stock?vendor_id=&variant_id=  → snapshot { on_hand, reserved, available }
// POST /admin/wms/stock  body: { vendor_id, variant_id, qty, type, source_id?, actor_id?, note? }
//   qty > 0 → incrementStock,  qty < 0 → decrementStock(abs(qty))

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendor_id = req.query.vendor_id as string | undefined
  const variant_id = req.query.variant_id as string | undefined
  if (!vendor_id || !variant_id) {
    return res.status(400).json({ error: "vendor_id and variant_id required" })
  }
  const svc: any = req.scope.resolve("wmsService")
  const snap = await svc.getStock(vendor_id, variant_id)
  res.json(snap)
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as any
  const { vendor_id, variant_id, qty, type, source_id, actor_id, note } = body
  if (!vendor_id || !variant_id || qty == null || !type) {
    return res
      .status(400)
      .json({ error: "vendor_id, variant_id, qty, type required" })
  }
  const svc: any = req.scope.resolve("wmsService")
  const absQty = Math.abs(Number(qty))
  if (absQty === 0) {
    return res.status(400).json({ error: "qty must be non-zero" })
  }
  const result =
    Number(qty) > 0
      ? await svc.incrementStock({
          vendor_id,
          variant_id,
          qty: absQty,
          type,
          source_id,
          actor_id,
          note,
        })
      : await svc.decrementStock({
          vendor_id,
          variant_id,
          qty: absQty,
          type,
          source_id,
          actor_id,
          note,
        })
  res.json(result)
}
