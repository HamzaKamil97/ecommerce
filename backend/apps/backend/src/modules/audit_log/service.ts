import { MedusaService } from '@medusajs/framework/utils';
import { AuditLog } from './models/audit-log.model';
import { AuditLogServiceInterface, WriteAuditInput, AuditLogRow } from './types';

class AuditLogServiceBase extends MedusaService({ AuditLog }) {}

export class AuditLogService extends AuditLogServiceBase
  implements AuditLogServiceInterface {

  ping(): string { return 'audit-log-ok'; }

  async writeAudit(input: WriteAuditInput): Promise<AuditLogRow> {
    const created = await (this as any).createAuditLogs({
      vendor_id: input.vendor_id,
      actor_id: input.actor_id,
      actor_type: input.actor_type,
      module: input.module,
      action: input.action,
      entity_id: input.entity_id ?? null,
      before_json: input.before_json ?? null,
      after_json: input.after_json ?? null,
      metadata: input.metadata ?? null,
    });
    const row: any = Array.isArray(created) ? created[0] : created;
    return {
      id: row.id, vendor_id: row.vendor_id, actor_id: row.actor_id,
      actor_type: row.actor_type, module: row.module, action: row.action,
      entity_id: row.entity_id, before_json: row.before_json, after_json: row.after_json,
      metadata: row.metadata, created_at: row.created_at,
    };
  }

  async listAuditByVendor(vendorId: string, opts: { limit?: number; offset?: number } = {}): Promise<AuditLogRow[]> {
    const [rows] = await (this as any).listAndCountAuditLogs(
      { vendor_id: vendorId },
      { take: opts.limit ?? 50, skip: opts.offset ?? 0, order: { created_at: 'DESC' } },
    );
    return rows;
  }
}

export default AuditLogService;
