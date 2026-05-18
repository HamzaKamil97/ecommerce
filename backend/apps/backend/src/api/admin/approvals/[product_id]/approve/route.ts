import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { APPROVAL_MODULE } from "../../../../../modules/approval"
import type ApprovalService from "../../../../../modules/approval/service"

// POST /admin/approvals/{product_id}/approve   body: { note?: string }

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(APPROVAL_MODULE) as ApprovalService
  const productId = req.params.product_id
  const reviewerId = (req as any).auth_context?.actor_id ?? "system"
  const body = (req.body as any) || {}
  const updated = await svc.approve(productId, reviewerId, body.note)
  res.json({ approval: updated })
}
