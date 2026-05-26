import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

/**
 * Returns whether the authenticated admin user is a super-admin.
 * Reads `is_super_admin` directly from the `user` table since Medusa's
 * default /admin/users/me serializer doesn't include custom columns.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const user: any = (req as any).auth_context?.actor_id
    ? { id: (req as any).auth_context.actor_id }
    : (req as any).user;

  if (!user?.id) {
    return res.status(401).json({ error: 'authentication required' });
  }

  try {
    const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);
    const r = await pg.raw(
      `SELECT id, email, is_super_admin FROM "user" WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [user.id],
    );
    const rows = r?.rows ?? r ?? [];
    if (!rows.length) {
      return res.status(404).json({ error: 'user not found' });
    }
    return res.json({
      user: {
        id: rows[0].id,
        email: rows[0].email,
        is_super_admin: !!rows[0].is_super_admin,
      },
    });
  } catch (e: any) {
    return res.status(500).json({ error: 'lookup failed', message: e?.message });
  }
}
