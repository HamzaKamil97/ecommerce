// backend/apps/backend/src/modules/inventory_count/models/count-session.model.ts
import { model } from '@medusajs/framework/utils';
import { CountLine } from './count-line.model';

export const CountSession = model.define('inventory_count_session', {
  id: model.id({ prefix: 'ics' }).primaryKey(),
  vendor_id: model.text().index(),
  actor_id: model.text(),
  scope: model.text(),
  status: model.enum(['in_progress', 'applied', 'cancelled']).default('in_progress'),
  expected_total: model.number().nullable(),
  counted_total: model.number().nullable(),
  delta_total: model.number().nullable(),
  note: model.text().nullable(),
  applied_at: model.dateTime().nullable(),
  lines: model.hasMany(() => CountLine, { mappedBy: 'session' }),
});
