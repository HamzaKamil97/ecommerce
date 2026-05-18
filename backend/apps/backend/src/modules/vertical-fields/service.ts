import { MedusaService } from "@medusajs/framework/utils"
import { VerticalProductFields } from "./models/vertical-product-fields"
import { getTemplate, VERTICAL_TEMPLATES } from "./templates"

class VerticalFieldsService extends MedusaService({
  VerticalProductFields,
}) {
  getTemplate(vertical?: string) {
    return getTemplate(vertical)
  }

  listTemplates() {
    return Object.values(VERTICAL_TEMPLATES)
  }

  async getForProduct(productId: string) {
    const [row] = await this.listVerticalProductFields({ product_id: productId })
    return row ?? null
  }

  async setForProduct(productId: string, vertical: string, fields: any) {
    const tmpl = getTemplate(vertical)
    // Light validation — required fields must be present.
    for (const f of tmpl.fields) {
      if (f.required && (fields?.[f.key] === undefined || fields?.[f.key] === null || fields?.[f.key] === "")) {
        throw new Error(`Vertical field "${f.key}" is required for vertical "${vertical}"`)
      }
    }
    const existing = await this.getForProduct(productId)
    if (existing) {
      return (this as any).updateVerticalProductFields({ id: existing.id, vertical, fields })
    }
    return (this as any).createVerticalProductFields({ product_id: productId, vertical, fields })
  }
}

export default VerticalFieldsService
