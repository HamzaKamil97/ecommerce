import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { POS_TAG_MODULE } from "../../../../modules/pos_tag"

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(POS_TAG_MODULE) as any
  const [row] = await svc.listPosTags({ id: req.params.id })
  if (!row) return res.status(404).json({ error: "Not found" })
  ;(req as any).audit_context = { vendor_id: row.vendor_id }
  const body = (req.body as any) || {}
  const allowed: any = {}
  if (typeof body.name === "string") allowed.name = body.name
  if (typeof body.featured === "boolean") allowed.featured = body.featured
  if (typeof body.position === "number") allowed.position = body.position
  // Use object form to avoid the positional-id bug (MedusaService needs {id,...})
  const updated = await svc.updatePosTags({ id: req.params.id, ...allowed })
  res.json({ tag: updated })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(POS_TAG_MODULE) as any
  const [row] = await svc.listPosTags({ id: req.params.id })
  if (!row) return res.status(404).json({ error: "Not found" })
  await svc.deletePosTags(req.params.id)
  res.status(204).end()
}
