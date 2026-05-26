import { model } from '@medusajs/framework/utils';

export const Schema = model.define('catalog_schema_schema', {
  id: model.id({ prefix: 'css' }).primaryKey(),
  category_handle: model.text().unique(),
  fields_json: model.json(),
});
