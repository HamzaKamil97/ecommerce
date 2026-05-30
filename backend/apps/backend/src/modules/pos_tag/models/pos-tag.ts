import { model } from '@medusajs/framework/utils'

export const PosTag = model.define('pos_tag', {
  id: model.id().primaryKey(),
  vendor_id: model.text(),
  name: model.text(),
  slug: model.text(),
  featured: model.boolean().default(false),
  position: model.number().default(0),
}).indexes([
  { on: ['vendor_id', 'slug'], unique: true },
  { on: ['vendor_id'] },
])
