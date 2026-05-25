import { model } from '@medusajs/framework/utils';

export const SaleLine = model.define('pos_sale_line', {
  id: model.id({ prefix: 'psl' }).primaryKey(),
  sale_id: model.text().index(),
  variant_id: model.text().index(),
  qty: model.bigNumber(),
  unit_price_minor: model.bigNumber(),
  name_snapshot: model.text(),
});
