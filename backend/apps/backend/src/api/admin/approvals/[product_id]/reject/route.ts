import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { APPROVAL_MODULE } from "../../../../../modules/approval"
import type ApprovalService from "../../../../../modules/approval/service"

// POST /admin/approvals/{product_id}/reject   body: { note: string (required) }

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(APPROVAL_MODULE) as ApprovalService
  const productId = req.params.product_id
  const reviewerId = (req as any).auth_context?.actor_id ?? "system"
  const body = (req.body as any) || {}
  if (!body.note || typeof body.note !== "string") {
    return res.status(400).json({ error: "note is required for rejection" })
  }
  const updated = await svc.reject(productId, reviewerId, body.note)
  res.json({ approval: updated })
}
