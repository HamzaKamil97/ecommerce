import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TENANT_MODULE } from "../../modules/tenant"

/**
 * Returns the tenant_id the calling user is allowed to manage, or null
 * (after writing a 403 to res). Super-admin gets the requested tenantId.
 * Regular vendor gets their own.
 */
export async function requireTenantAccess(
  req: MedusaRequest,
  res: MedusaResponse,
  requestedTenantId: string
): Promise<string | null> {
  const actorId = (req as any).auth_context?.actor_id
  const actorType = (req as any).auth_context?.actor_type

  // Super-admin bypass (admin user actors)
  if (actorType === "user" || actorType === "admin") {
    return requestedTenantId
  }

  // Vendor — must match their tenant
  const tenantSvc = req.scope.resolve(TENANT_MODULE) as any
  const tenant = await tenantSvc.getTenantForUser(actorId)
  if (!tenant || tenant.id !== requestedTenantId) {
    res.status(403).json({ error: "Forbidden: tenant mismatch" })
    return null
  }
  return tenant.id
}
