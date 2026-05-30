import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { POS_REFUND_REQUEST_MODULE } from '../../../../modules/pos_refund_request'

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendor_id = req.query.vendor_id as string | undefined
  if (!vendor_id) return res.status(400).json({ error: 'vendor_id required' })
  const status = req.query.status as string | undefined
  const svc: any = req.scope.resolve(POS_REFUND_REQUEST_MODULE)
  res.json({ approvals: await svc.listForVendor(vendor_id, status) })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const b = (req.body ?? {}) as any
  for (const k of ['vendor_id', 'original_sale_id', 'total_minor', 'reason', 'requested_by', 'payload']) {
    if (b[k] == null) return res.status(400).json({ error: `${k} required` })
  }
  ;(req as any).audit_context = { vendor_id: b.vendor_id }
  const svc: any = req.scope.resolve(POS_REFUND_REQUEST_MODULE)
  const created = await svc.createRequest({
    vendor_id: b.vendor_id,
    original_sale_id: b.original_sale_id,
    total_minor: Number(b.total_minor),
    reason: b.reason,
    requested_by: b.requested_by,
    requested_by_name: b.requested_by_name ?? null,
    payload: b.payload,
  })
  const approval = Array.isArray(created) ? created[0] : created
  res.status(201).json({ approval })
}
