import { model } from '@medusajs/framework/utils';
import { ScanCart } from './scan-cart.model';

export const ScanCartLine = model.define('scan_cart_line', {
  id: model.id({ prefix: 'scl' }).primaryKey(),
  cart: model.belongsTo(() => ScanCart, { mappedBy: 'lines' }),
  variant_id: model.text(),
  title: model.text(),
  qty: model.number().default(1),
  unit_price_minor: model.bigNumber().default(0),
  weigh_at_counter: model.boolean().default(false),
  priced: model.boolean().default(true),
});
