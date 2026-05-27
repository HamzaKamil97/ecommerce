// backend/apps/backend/src/modules/online_order/models/online-order-line.model.ts
import { model } from '@medusajs/framework/utils';
import { OnlineOrder } from './online-order.model';

export const OnlineOrderLine = model.define('online_order_line', {
  id: model.id({ prefix: 'ool' }).primaryKey(),
  order: model.belongsTo(() => OnlineOrder, { mappedBy: 'lines' }),
  variant_id: model.text(),
  title: model.text(),
  qty: model.number(),
  unit_price_minor: model.bigNumber(),
  line_total_minor: model.bigNumber(),
  aisle_hint: model.text().nullable(),
  picked: model.boolean().default(false),
  oos: model.boolean().default(false),
});
