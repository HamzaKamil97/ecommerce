import { model } from '@medusajs/framework/utils'

export const PosRefundRequest = model.define('pos_refund_request', {
  id: model.id().primaryKey(),
  vendor_id: model.text(),
  original_sale_id: model.text(),
  total_minor: model.number(),
  reason: model.text(),
  requested_by: model.text(),
  requested_by_name: model.text().nullable(),
  status: model.text().default('pending'),   // pending | approved | declined
  payload: model.json(),                      // full ProcessReturnInput
  approved_by: model.text().nullable(),
  approved_at: model.dateTime().nullable(),
}).indexes([
  { on: ['vendor_id', 'status'] },
  { on: ['vendor_id'] },
])
