import { MedusaService } from '@medusajs/framework/utils'
import { PosTag } from './models/pos-tag'

function slugify(n: string) {
  return n.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

class PosTagService extends MedusaService({ PosTag }) {
  async listForVendor(vendor_id: string) {
    return this.listPosTags(
      { vendor_id },
      { order: { featured: 'DESC', position: 'ASC', name: 'ASC' } }
    )
  }

  async createForVendor(
    vendor_id: string,
    d: { name: string; featured?: boolean; position?: number }
  ) {
    const slug = slugify(d.name)
    const [dup] = await this.listPosTags({ vendor_id, slug })
    if (dup) throw new Error(`tag "${slug}" already exists`)
    return this.createPosTags({
      vendor_id,
      name: d.name,
      slug,
      featured: !!d.featured,
      position: d.position ?? 0,
    })
  }
}

export default PosTagService
