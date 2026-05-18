import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MERCH_MODULE } from "../../../../../modules/merch"
import { TENANT_MODULE } from "../../../../../modules/tenant"

// GET /store/tenants/:slug/merch-categories
// Returns the shop's flat merch buckets. Requires publishable API key.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const tenantSvc = req.scope.resolve(TENANT_MODULE) as any
  const merchSvc = req.scope.resolve(MERCH_MODULE) as any

  const tenant = await tenantSvc.getBySlug(req.params.slug)
  if (!tenant) {
    return res.status(404).json({ error: `Shop "${req.params.slug}" not found` })
  }

  const categories = await merchSvc.listForTenant(tenant.id)
  res.json({
    tenant: { slug: tenant.slug, name: tenant.name },
    merch_categories: categories.map((c: any) => ({
      id: c.id,
      handle: c.handle,
      name: c.name,
      position: c.position,
      icon_url: c.icon_url,
    })),
  })
}
