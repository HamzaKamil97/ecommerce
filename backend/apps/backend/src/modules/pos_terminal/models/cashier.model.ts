import { model } from '@medusajs/framework/utils';

export const Cashier = model.define('pos_cashier', {
  id: model.id({ prefix: 'psc' }).primaryKey(),
  vendor_id: model.text().index(),
  name: model.text(),
  pin_hash: model.text(),
  pin_salt: model.text(),
  role: model.enum(['cashier', 'manager']).default('cashier'),
  active: model.boolean().default(true),
  permission_overrides: model.json().nullable(),
});
