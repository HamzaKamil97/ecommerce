// backend/apps/backend/src/modules/audit_log/types.ts
export type AuditActorType = 'user' | 'cashier' | 'system';
export type AuditAction = 'create' | 'update' | 'delete' | 'adjust' | 'refund' | 'login' | 'permission_change' | 'other';

export type WriteAuditInput = {
  vendor_id: string | null;
  actor_id: string | null;
  actor_type: AuditActorType;
  module: string;
  action: AuditAction;
  entity_id?: string | null;
  before_json?: unknown;
  after_json?: unknown;
  metadata?: Record<string, unknown>;
};

export type AuditLogRow = {
  id: string;
  vendor_id: string | null;
  actor_id: string | null;
  actor_type: AuditActorType;
  module: string;
  action: AuditAction;
  entity_id: string | null;
  before_json: unknown;
  after_json: unknown;
  metadata: Record<string, unknown> | null;
  created_at: Date;
};

export interface AuditLogServiceInterface {
  ping(): string;
  writeAudit(input: WriteAuditInput): Promise<AuditLogRow>;
  listAuditByVendor(vendorId: string, opts?: { limit?: number; offset?: number }): Promise<AuditLogRow[]>;
}
