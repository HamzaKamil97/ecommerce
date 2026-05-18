import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { APPROVAL_MODULE } from "../../../modules/approval"
import type ApprovalService from "../../../modules/approval/service"

// GET  /admin/approvals?status=pending_review   → list approvals (optional filter)
// POST /admin/approvals/sync                    → ensure every product has an approval row

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(APPROVAL_MODULE) as ApprovalService
  const status = (req.query.status as string) || "pending_review"
  const rows = await svc.listProductApprovals({ approval_status: status })
  res.json({
    approvals: rows,
    count: rows.length,
    filter: { status },
  })
}
