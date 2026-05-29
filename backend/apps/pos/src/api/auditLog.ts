/**
 * auditLog.ts — Audit log API client
 *
 * Backed by the A1 route (shipped in Phase H-3.2a):
 *   GET  /admin/audit-log          → { rows, total, limit, offset }
 *   GET  /admin/audit-log/export.csv  → CSV stream
 *
 * NOTE: exportAuditLogUrl() returns a plain URL string for use in an <a download> tag.
 * A plain <a download> cannot send the Bearer token, so live CSV export auth is a known
 * follow-up (e.g. short-lived signed URL or cookie auth).
 */

import { apiGet } from './client';
import { API_BASE } from '../env';

// ─── Types ──────────────────────────────────────────────────────────────────

export type AuditRow = {
  id: string;
  vendor_id: string;
  actor_id?: string | null;
  actor_type: string;
  module: string;
  action: string;
  entity_id?: string | null;
  before_json: any;
  after_json: any;
  metadata: any;
  created_at: string;
};

export type AuditFilter = {
  vendor_id: string;
  actor_id?: string;
  module?: string;
  since?: string;
  until?: string;
  limit?: number;
  offset?: number;
};

export type AuditLogPage = {
  rows: AuditRow[];
  total: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build URLSearchParams skipping undefined / empty-string values. */
function buildQs(f: AuditFilter): string {
  const p = new URLSearchParams();
  const entries: [string, string | number | undefined][] = [
    ['vendor_id', f.vendor_id],
    ['actor_id', f.actor_id],
    ['module', f.module],
    ['since', f.since],
    ['until', f.until],
    ['limit', f.limit],
    ['offset', f.offset],
  ];
  for (const [key, val] of entries) {
    if (val !== undefined && val !== '') p.set(key, String(val));
  }
  return p.toString();
}

// ─── API calls ───────────────────────────────────────────────────────────────

/** List audit log rows for the given filter. */
export function listAuditLog(f: AuditFilter): Promise<AuditLogPage> {
  const qs = buildQs(f);
  return apiGet<AuditLogPage>(`/admin/audit-log${qs ? `?${qs}` : ''}`);
}

/**
 * Build a full URL for the CSV export endpoint.
 * Prefixed with API_BASE so the href is directly usable in <a href> / <a download>.
 *
 * NOTE: a plain <a download> cannot send the Bearer token — live CSV export auth
 * is a known follow-up (short-lived signed URL or cookie-based auth).
 */
export function exportAuditLogUrl(f: AuditFilter): string {
  const qs = buildQs(f);
  return `${API_BASE}/admin/audit-log/export.csv${qs ? `?${qs}` : ''}`;
}
