import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve('inventoryCountService');
  const id = (req.params as any).id;
  const body = (req.body ?? {}) as any;
  if (!body.actor_id) return res.status(400).json({ error: 'actor_id required' });
  try {
    const session = await svc.applyCount({ session_id: id, actor_id: body.actor_id });
    res.json({ session });
  } catch (e: any) {
    // Path B: A4's service does not yet surface partial-failure metadata. If a
    // wms increment/decrement throws mid-loop the error bubbles up here as 500.
    // Adding COUNT_APPLY_PARTIAL + applied_line_index tracking is deferred to a
    // follow-up commit (A4 reviewer's I1 recommendation).
    const status = e.code === 'COUNT_NOT_FOUND' ? 404
      : e.code === 'COUNT_NOT_OPEN' ? 409
      : 500;
    res.status(status).json({ error: e?.message, code: e?.code });
  }
}
