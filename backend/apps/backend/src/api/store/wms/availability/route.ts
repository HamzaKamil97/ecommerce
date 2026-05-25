import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// POST /store/wms/availability
//   body: { vendor_id, lines: [{ variant_id, qty }, ...] }
//   → { lines: [{ variant_id, requested, available: bool, available_qty: number }, ...] }
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as any
  const { vendor_id, lines } = body
  if (!vendor_id || !Array.isArray(lines)) {
    return res.status(400).json({ error: "vendor_id and lines[] required" })
  }
  const svc: any = req.scope.resolve("wmsService")
  const results = await Promise.all(
    lines.map(async (l: any) => {
      const snap = await svc.getStock(vendor_id, l.variant_id)
      return {
        variant_id: l.variant_id,
        requested: l.qty,
        available: snap.available >= l.qty,
        available_qty: snap.available,
      }
    }),
  )
  res.json({ lines: results })
}
