import { model } from '@medusajs/framework/utils';

export const Sale = model.define('pos_sale', {
  id: model.id({ prefix: 'pos' }).primaryKey(),
  vendor_id: model.text().index(),
  cashier_id: model.text(),
  terminal_id: model.text(),
  client_id: model.text().unique(),
  total_minor: model.bigNumber(),
  paid_amount_minor: model.bigNumber(),
  change_due_minor: model.bigNumber(),
  currency_code: model.text(),
  status: model.enum(['completed', 'voided']).default('completed'),
  voided_at: model.dateTime().nullable(),
  client_created_at: model.dateTime().nullable(),
  channel: model.text().default('offline'),
});
