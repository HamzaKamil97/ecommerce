import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MERCH_MODULE } from "../../../../../modules/merch"
import { requireTenantAccess } from "../../../../_lib/require-tenant-access"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const tenantId = await requireTenantAccess(req, res, req.params.tenantId)
  if (!tenantId) return
  const merch = req.scope.resolve(MERCH_MODULE) as any
  const list = await merch.listForTenant(tenantId)
  res.json({ merch_categories: list })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const tenantId = await requireTenantAccess(req, res, req.params.tenantId)
  if (!tenantId) return
  const merch = req.scope.resolve(MERCH_MODULE) as any
  const body = (req.body as any) || {}
  if (!body.name) {
    return res.status(400).json({ error: "name is required" })
  }
  try {
    const created = await merch.createForTenant(tenantId, body)
    res.status(201).json({ merch_category: created })
  } catch (e: any) {
    res.status(409).json({ error: e.message })
  }
}
