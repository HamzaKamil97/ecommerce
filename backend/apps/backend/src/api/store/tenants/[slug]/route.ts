import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TENANT_MODULE } from "../../../../modules/tenant"
import type TenantService from "../../../../modules/tenant/service"

// GET /store/tenants/{slug}   public lookup (for white-label apps reading their own tenant config)

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(TENANT_MODULE) as TenantService
  const tenant = await svc.getBySlug(req.params.slug)
  if (!tenant || tenant.approval_status !== "approved") {
    return res.status(404).json({ error: "tenant not found" })
  }
  // Only expose the public-safe fields.
  res.json({
    tenant: {
      slug: tenant.slug,
      name: tenant.name,
      vertical: tenant.vertical,
      branding: tenant.branding,
      sales_channel_id: tenant.sales_channel_id,
    },
  })
}
