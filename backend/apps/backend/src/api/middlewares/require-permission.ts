import type { MedusaRequest, MedusaResponse, MedusaNextFunction } from '@medusajs/framework/http';
import { CapabilityKey, Role, resolveCapability } from '../../permissions/capabilities';

/**
 * Returns a middleware that checks the authenticated cashier has the given
 * capability. Looks up cashier.role + permission_overrides. 403 if missing.
 *
 * For routes called as the Medusa super-admin user (no cashier_id),
 * grants automatically. This is because super-admin auth predates cashier
 * sessions.
 *
 * Usage in a route file:
 *   import { requirePermission } from '../../../../middlewares/require-permission';
 *   export const middlewares = [requirePermission('catalog.add_edit_product')];
 */
export function requirePermission(capability: CapabilityKey) {
  return async function (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
    const cashierId = (req.headers['x-cashier-id'] as string | undefined)
      ?? (req.body as any)?.cashier_id
      ?? (req.query.cashier_id as string | undefined);

    if (!cashierId) {
      // No cashier context — fall back to admin auth (already checked by Medusa auth middleware)
      return next();
    }

    try {
      const svc: any = req.scope.resolve('posTerminalService');
      const [rows] = await svc.listAndCountCashiers({ id: cashierId, active: true });
      if (!rows.length) {
        return res.status(401).json({ error: 'cashier not found', code: 'CASHIER_NOT_FOUND' });
      }
      const row = rows[0];
      const role = row.role as Role;
      const overrides = (row.permission_overrides ?? {}) as Partial<Record<CapabilityKey, true | false | 'pin'>>;
      const grant = resolveCapability(role, capability, overrides);
      if (grant === false) {
        return res.status(403).json({
          error: `capability ${capability} not granted`,
          code: 'PERMISSION_DENIED',
          required_capability: capability,
        });
      }
      if (grant === 'pin') {
        const pin = req.headers['x-pin-confirm'] as string | undefined;
        if (!pin) {
          return res.status(401).json({
            error: 'PIN re-prompt required',
            code: 'PIN_REQUIRED',
            required_capability: capability,
          });
        }
        try {
          await svc.verifyCashierPin(cashierId, pin);
        } catch {
          return res.status(401).json({ error: 'bad PIN', code: 'BAD_PIN' });
        }
      }
      return next();
    } catch (e: any) {
      return res.status(500).json({ error: 'permission check failed', message: e?.message });
    }
  };
}
