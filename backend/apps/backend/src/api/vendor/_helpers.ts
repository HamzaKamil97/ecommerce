import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TENANT_MODULE } from "../../modules/tenant"
import type TenantService from "../../modules/tenant/service"

// Resolves the vendor + tenant for the authenticated user.
// TODO: replace x-vendor-user-id header with proper auth middleware that reads JWT.
//        For now, vendor portal must send the authenticated user's id in this header.
export async function resolveVendorContext(req: MedusaRequest, res: MedusaResponse) {
  const userId =
    (req.headers["x-vendor-user-id"] as string) ||
    (req as any).auth_context?.actor_id

  if (!userId) {
    res.status(401).json({ error: "Unauthorized: missing vendor identity" })
    return null
  }

  const svc = req.scope.resolve(TENANT_MODULE) as TenantService
  const [vendor] = await svc.listVendors({ user_id: userId })
  if (!vendor || !vendor.is_active) {
    res.status(403).json({ error: "Not a vendor or vendor inactive" })
    return null
  }
  const tenant = await svc.retrieveTenant(vendor.tenant_id).catch(() => null)
  if (!tenant) {
    res.status(403).json({ error: "Vendor's tenant not found" })
    return null
  }
  return { vendor, tenant, svc }
}
