import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TENANT_MODULE } from "../../../modules/tenant"
import type TenantService from "../../../modules/tenant/service"

// GET  /admin/tenants                 list all tenants
// POST /admin/tenants                 create tenant   body: { slug, name, vertical?, plan?, branding?, sales_channel_id? }

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(TENANT_MODULE) as TenantService
  const tenants = await svc.listTenants({})
  res.json({ tenants, count: tenants.length })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(TENANT_MODULE) as TenantService
  const body = (req.body as any) || {}
  if (!body.slug || !body.name) {
    return res.status(400).json({ error: "slug and name are required" })
  }
  const created = await svc.createTenants({
    slug: body.slug,
    name: body.name,
    vertical: body.vertical ?? "general",
    plan: body.plan ?? "marketplace",
    sales_channel_id: body.sales_channel_id ?? null,
    branding: body.branding ?? null,
    domain: body.domain ?? null,
    approval_status: "pending",
  })
  res.status(201).json({ tenant: created })
}
