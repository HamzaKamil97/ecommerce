// backend/apps/backend/src/modules/cash_session/models/cash-session.model.ts
import { model } from '@medusajs/framework/utils';

export const CashSession = model.define('cash_session', {
  id: model.id({ prefix: 'cs' }).primaryKey(),
  vendor_id: model.text().index(),
  terminal_id: model.text(),
  cashier_id: model.text(),
  opening_float_minor: model.bigNumber(),
  cash_sales_minor: model.bigNumber().default(0),
  refunds_minor: model.bigNumber().default(0),
  expected_total_minor: model.bigNumber().default(0),
  counted_total_minor: model.bigNumber().nullable(),
  diff_minor: model.bigNumber().nullable(),
  denomination_count: model.json().nullable(),
  note: model.text().nullable(),
  status: model.enum(['open', 'closed']).default('open'),
  opened_at: model.dateTime(),
  closed_at: model.dateTime().nullable(),
  currency_code: model.text().default('iqd'),
});
