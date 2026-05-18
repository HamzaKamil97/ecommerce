import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TENANT_MODULE } from "../../../modules/tenant"
import type TenantService from "../../../modules/tenant/service"

// GET /store/tenants?vertical=food&limit=50    public list of approved tenants
// Used by mobile "Shops" tab and web storefront's shop directory.

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(TENANT_MODULE) as TenantService
  const filters: any = { approval_status: "approved" }
  if (req.query.vertical) filters.vertical = String(req.query.vertical)
  const tenants = await svc.listTenants(filters, { take: Math.min(100, Number(req.query.limit ?? 50)) })
  // strip private fields
  const safe = tenants.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    vertical: t.vertical,
    sales_channel_id: t.sales_channel_id,
    branding: t.branding,
    plan: t.plan,
  }))
  res.json({ tenants: safe, count: safe.length })
}
