import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { APPROVAL_MODULE } from "../../../../../modules/approval"
import type ApprovalService from "../../../../../modules/approval/service"

// GET /admin/approvals/{product_id}/audit   → full audit trail for the product

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(APPROVAL_MODULE) as ApprovalService
  const productId = req.params.product_id
  const audits = await svc.listAuditTrail(productId)
  res.json({ audits, count: audits.length })
}
