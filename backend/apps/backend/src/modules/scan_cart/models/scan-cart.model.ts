import { model } from '@medusajs/framework/utils';
import { ScanCartLine } from './scan-cart-line.model';

export const ScanCart = model.define('scan_cart', {
  id: model.id({ prefix: 'sc' }).primaryKey(),
  vendor_id: model.text().index(),
  staff_id: model.text().nullable(),
  short_code: model.text().nullable(),
  status: model.enum(['OPEN', 'PENDING_CASHIER', 'PAID', 'EXPIRED', 'VOID']).default('OPEN'),
  locked_at: model.dateTime().nullable(),
  expires_at: model.dateTime().nullable(),
  paid_sale_id: model.text().nullable(),
  lines: model.hasMany(() => ScanCartLine, { mappedBy: 'cart' }),
});
