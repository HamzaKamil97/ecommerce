import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TENANT_MODULE } from "../../../../modules/tenant"
import type TenantService from "../../../../modules/tenant/service"

// GET    /admin/tenants/{id}      retrieve
// POST   /admin/tenants/{id}      update    body: partial Tenant
// DELETE /admin/tenants/{id}      delete

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(TENANT_MODULE) as TenantService
  const tenant = await svc.retrieveTenant(req.params.id).catch(() => null)
  if (!tenant) return res.status(404).json({ error: "tenant not found" })
  const vendors = await svc.listVendorsForTenant(req.params.id)
  res.json({ tenant, vendors })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(TENANT_MODULE) as TenantService
  const updated = await svc.updateTenants({ id: req.params.id, ...(req.body as any) })
  res.json({ tenant: updated })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(TENANT_MODULE) as TenantService
  await svc.deleteTenants(req.params.id)
  res.json({ id: req.params.id, deleted: true })
}
