import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve('cashSessionService');
  const terminal_id = req.query.terminal_id as string;
  if (!terminal_id) return res.status(400).json({ error: 'terminal_id required' });
  const session = await svc.getCurrent(terminal_id);
  res.json({ session });
}
