import { Module } from '@medusajs/framework/utils';
import { AuditLogService } from './service';

export const AUDIT_LOG_MODULE = 'auditLogService';

export default Module(AUDIT_LOG_MODULE, {
  service: AuditLogService,
});
