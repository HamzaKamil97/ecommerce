import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MERCH_MODULE } from "../../../../../../modules/merch"
import { requireTenantAccess } from "../../../../../_lib/require-tenant-access"

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const tenantId = await requireTenantAccess(req, res, req.params.tenantId)
  if (!tenantId) return
  const merch = req.scope.resolve(MERCH_MODULE) as any
  const [row] = await merch.listMerchCategories({ id: req.params.id, tenant_id: tenantId })
  if (!row) return res.status(404).json({ error: "Not found" })
  const body = (req.body as any) || {}
  const allowed: any = {}
  if (typeof body.name === "string") allowed.name = body.name
  if (typeof body.position === "number") allowed.position = body.position
  if ("icon_url" in body) allowed.icon_url = body.icon_url
  const updated = await merch.updateMerchCategories(req.params.id, allowed)
  res.json({ merch_category: updated })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const tenantId = await requireTenantAccess(req, res, req.params.tenantId)
  if (!tenantId) return
  const merch = req.scope.resolve(MERCH_MODULE) as any
  const [row] = await merch.listMerchCategories({ id: req.params.id, tenant_id: tenantId })
  if (!row) return res.status(404).json({ error: "Not found" })
  await merch.deleteMerchCategories(req.params.id)
  res.status(204).end()
}
