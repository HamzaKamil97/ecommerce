import { MedusaService } from "@medusajs/framework/utils"
import { Tenant } from "./models/tenant"
import { Vendor } from "./models/vendor"

class TenantService extends MedusaService({
  Tenant,
  Vendor,
}) {
  async getBySlug(slug: string) {
    const [row] = await this.listTenants({ slug })
    return row ?? null
  }

  async getByDomain(domain: string) {
    const [row] = await this.listTenants({ domain })
    return row ?? null
  }

  async getBySalesChannel(salesChannelId: string) {
    const [row] = await this.listTenants({ sales_channel_id: salesChannelId })
    return row ?? null
  }

  async listVendorsForTenant(tenantId: string) {
    return this.listVendors({ tenant_id: tenantId })
  }

  async getTenantForUser(userId: string) {
    const [vendor] = await this.listVendors({ user_id: userId })
    if (!vendor) return null
    return this.retrieveTenant(vendor.tenant_id)
  }

  async approveTenant(tenantId: string) {
    return this.updateTenants({ id: tenantId, approval_status: "approved" })
  }

  async suspendTenant(tenantId: string) {
    return this.updateTenants({ id: tenantId, approval_status: "suspended" })
  }
}

export default TenantService
