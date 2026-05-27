// backend/apps/backend/src/modules/online_order/models/online-order.model.ts
import { model } from '@medusajs/framework/utils';
import { OnlineOrderLine } from './online-order-line.model';

export const OnlineOrder = model.define('online_order', {
  id: model.id({ prefix: 'oo' }).primaryKey(),
  vendor_id: model.text().index(),
  customer_id: model.text().nullable(),
  customer_name: model.text().nullable(),
  customer_phone: model.text().nullable(),
  total_minor: model.bigNumber(),
  currency_code: model.text().default('iqd'),
  status: model.enum([
    'pending', 'accepted', 'rejected', 'picking', 'delivered', 'cancelled', 'refunded',
  ]).default('pending'),
  commission_rate_bps_snapshot: model.number(),
  commission_minor: model.bigNumber(),
  payout_status: model.enum(['pending', 'paid', 'disputed']).default('pending'),
  channel: model.text().default('hanoot'),
  delivery_address: model.text().nullable(),
  delivery_lat: model.number().nullable(),
  delivery_lng: model.number().nullable(),
  voice_note_url: model.text().nullable(),
  placed_at: model.dateTime(),
  accepted_at: model.dateTime().nullable(),
  rejected_at: model.dateTime().nullable(),
  delivered_at: model.dateTime().nullable(),
  lines: model.hasMany(() => OnlineOrderLine, { mappedBy: 'order' }),
});
