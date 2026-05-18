import { MedusaService } from "@medusajs/framework/utils"
import { MerchCategory } from "./models/merch-category"

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

class MerchService extends MedusaService({
  MerchCategory,
}) {
  async listForTenant(tenantId: string) {
    return this.listMerchCategories(
      { tenant_id: tenantId },
      { order: { position: "ASC", created_at: "ASC" } }
    )
  }

  async getByHandleForTenant(tenantId: string, handle: string) {
    const [row] = await this.listMerchCategories({ tenant_id: tenantId, handle })
    return row ?? null
  }

  async createForTenant(tenantId: string, data: { name: string; handle?: string; position?: number; icon_url?: string | null }) {
    const handle = data.handle ?? slugify(data.name)
    const existing = await this.getByHandleForTenant(tenantId, handle)
    if (existing) {
      throw new Error(`merch_category handle "${handle}" already exists for tenant ${tenantId}`)
    }
    return this.createMerchCategories({
      tenant_id: tenantId,
      handle,
      name: data.name,
      position: data.position ?? 0,
      icon_url: data.icon_url ?? null,
    })
  }
}

export default MerchService
