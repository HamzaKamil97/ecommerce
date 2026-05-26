import type { MedusaRequest, MedusaResponse, MedusaNextFunction } from '@medusajs/framework/http';

/**
 * Gates /super-admin/* routes to users with users.is_super_admin = true.
 * Looks up the authenticated user (set by Medusa's auth middleware) and
 * checks the flag. 403 if not super-admin.
 */
export async function requireSuperAdmin(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction): Promise<void> {
  const user: any = (req as any).user;
  if (!user?.id) {
    res.status(401).json({ error: 'authentication required', code: 'AUTH_REQUIRED' });
    return;
  }
  try {
    const userSvc: any = req.scope.resolve('user');
    const fullUser = await userSvc.retrieveUser(user.id);
    if (!fullUser?.is_super_admin) {
      res.status(403).json({
        error: 'super-admin access required',
        code: 'SUPER_ADMIN_REQUIRED',
      });
      return;
    }
    next();
  } catch (e: any) {
    res.status(500).json({ error: 'super-admin check failed', message: e?.message });
  }
}
