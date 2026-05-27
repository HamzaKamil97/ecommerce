// backend/apps/backend/src/modules/inventory_count/models/count-line.model.ts
import { model } from '@medusajs/framework/utils';
import { CountSession } from './count-session.model';

export const CountLine = model.define('inventory_count_line', {
  id: model.id({ prefix: 'icl' }).primaryKey(),
  session: model.belongsTo(() => CountSession, { mappedBy: 'lines' }),
  variant_id: model.text(),
  system_qty: model.number(),
  actual_qty: model.number(),
  delta: model.number(),
  reason: model.text().nullable(),
});
