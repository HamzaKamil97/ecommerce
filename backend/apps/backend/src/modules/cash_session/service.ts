// backend/apps/backend/src/modules/cash_session/service.ts
import { MedusaService, ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { CashSession } from './models/cash-session.model';
import {
  OpenSessionInput, CloseSessionInput, CashSessionRow,
} from './types';

class CashSessionServiceBase extends MedusaService({ CashSession }) {}

export class CashSessionService extends CashSessionServiceBase {
  ping(): string { return 'cash-session-ok'; }

  async openSession(input: OpenSessionInput): Promise<CashSessionRow> {
    // Reject if terminal already has open session
    const [existing] = await (this as any).listAndCountCashSessions({
      terminal_id: input.terminal_id, status: 'open',
    });
    if (existing.length > 0) {
      const err: any = new Error('terminal already has an open cash session');
      err.code = 'CASH_SESSION_OPEN_EXISTS';
      throw err;
    }
    const row = await (this as any).createCashSessions({
      vendor_id: input.vendor_id,
      terminal_id: input.terminal_id,
      cashier_id: input.cashier_id,
      opening_float_minor: input.opening_float_minor,
      opened_at: new Date(),
      currency_code: input.currency_code ?? 'iqd',
    });
    return Array.isArray(row) ? row[0] : row;
  }

  async closeSession(input: CloseSessionInput): Promise<CashSessionRow> {
    const [rows] = await (this as any).listAndCountCashSessions({ id: input.session_id });
    if (!rows.length) {
      const err: any = new Error('session not found'); err.code = 'CASH_SESSION_NOT_FOUND'; throw err;
    }
    const session = rows[0];
    if (session.status !== 'open') {
      const err: any = new Error('session already closed'); err.code = 'CASH_SESSION_ALREADY_CLOSED'; throw err;
    }
    // Re-derive cash_sales_minor + refunds_minor from pos_sale rows for accuracy
    const pg: any =
      (this as any).__container__[ContainerRegistrationKeys.PG_CONNECTION] ??
      (this as any).__container__['__pg_connection__'];
    const since = session.opened_at;
    let cashSales = 0;
    let refunds = 0;
    if (pg) {
      // pos_sale lives in a different module's schema. In isolated module tests
      // (moduleIntegrationTestRunner) the table isn't provisioned, so we precheck
      // via to_regclass rather than catching arbitrary errors. This preserves real
      // production failures (42501 insufficient_privilege, 08006 connection_failure,
      // 25P02 in_failed_sql_transaction, driver errors) instead of silently
      // reporting 0 cash sales / refunds — which would corrupt cash reconciliation
      // by accepting whatever the cashier counted as a clean diff.
      const probe = await pg.raw(`SELECT to_regclass('pos_sale') AS rel`);
      const probeRows: any[] = probe?.rows ?? probe ?? [];
      const tableExists = probeRows[0]?.rel != null;
      if (tableExists) {
        const result = await pg.raw(
          `SELECT
            COALESCE(SUM(CASE WHEN status='completed' THEN total_minor ELSE 0 END),0) AS cash_sum,
            COALESCE(SUM(CASE WHEN status='voided' THEN total_minor ELSE 0 END),0) AS refund_sum
           FROM pos_sale
           WHERE terminal_id = ? AND created_at >= ? AND deleted_at IS NULL`,
          [session.terminal_id, since],
        );
        const rowsRes: any[] = result?.rows ?? result ?? [];
        if (rowsRes.length) {
          cashSales = Number(rowsRes[0].cash_sum ?? 0);
          refunds = Number(rowsRes[0].refund_sum ?? 0);
        }
      }
    }
    const expected = Number(session.opening_float_minor) + cashSales - refunds;
    const diff = input.counted_total_minor - expected;
    const updated = await (this as any).updateCashSessions({
      id: input.session_id,
      cash_sales_minor: cashSales,
      refunds_minor: refunds,
      expected_total_minor: expected,
      counted_total_minor: input.counted_total_minor,
      diff_minor: diff,
      denomination_count: input.denomination_count,
      note: input.note ?? null,
      status: 'closed',
      closed_at: new Date(),
    });
    return Array.isArray(updated) ? updated[0] : updated;
  }

  async getCurrent(terminal_id: string): Promise<CashSessionRow | null> {
    const [rows] = await (this as any).listAndCountCashSessions({
      terminal_id, status: 'open',
    });
    return rows[0] ?? null;
  }

  async listHistory(vendor_id: string, opts: { limit?: number; offset?: number } = {}) {
    const [rows] = await (this as any).listAndCountCashSessions(
      { vendor_id },
      { take: opts.limit ?? 30, skip: opts.offset ?? 0, order: { opened_at: 'DESC' } },
    );
    return rows;
  }
}

export default CashSessionService;
