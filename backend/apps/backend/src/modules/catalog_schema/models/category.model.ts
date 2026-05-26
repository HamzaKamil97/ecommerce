import { model } from '@medusajs/framework/utils';

export const Category = model.define('catalog_schema_category', {
  id: model.id({ prefix: 'csc' }).primaryKey(),
  handle: model.text().unique(),
  name: model.text(),
  icon: model.text().nullable(),
  position: model.number().default(0),
});
