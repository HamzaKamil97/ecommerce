import { model } from '@medusajs/framework/utils';

export const AuditLog = model.define('platform_audit_log', {
  id: model.id({ prefix: 'aul' }).primaryKey(),
  vendor_id: model.text().nullable().index(),
  actor_id: model.text().nullable(),
  actor_type: model.enum(['user', 'cashier', 'system']),
  module: model.text(),
  action: model.text(),
  entity_id: model.text().nullable(),
  before_json: model.json().nullable(),
  after_json: model.json().nullable(),
  metadata: model.json().nullable(),
});
