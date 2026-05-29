import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

/**
 * GET /admin/staff/:id
 * Returns the cashier row (including permission_overrides) used by the staff
 * matrix UI. Soft-deleted rows are filtered automatically by the auto-generated
 * retrieveCashier method.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const id = (req.params as any).id as string;
  const pos: any = req.scope.resolve('posTerminalService');
  try {
    const cashier = await pos.retrieveCashier(id);
    return res.json({ cashier });
  } catch (e: any) {
    // Medusa's retrieve throws NotFound — translate to 404
    if (e?.type === 'not_found' || e?.message?.includes('not found')) {
      return res.status(404).json({ error: 'cashier not found' });
    }
    throw e;
  }
}
