import { MedusaService } from "@medusajs/framework/utils"
import { ProductApproval } from "./models/product-approval"
import { ApprovalAudit } from "./models/approval-audit"

type Status = "draft" | "pending_review" | "approved" | "rejected"

class ApprovalService extends MedusaService({
  ProductApproval,
  ApprovalAudit,
}) {
  // Idempotent: ensure each product has an approval row.
  async ensureApproval(productId: string, initialStatus: Status = "draft", actorUserId?: string) {
    const existing = await this.listProductApprovals({ product_id: productId })
    if (existing.length > 0) return existing[0]
    const created = await this.createProductApprovals({
      product_id: productId,
      approval_status: initialStatus,
    })
    await this.createApprovalAudits({
      product_id: productId,
      actor_user_id: actorUserId ?? null,
      action: "product_created",
      old_status: null,
      new_status: initialStatus,
    })
    return Array.isArray(created) ? created[0] : created
  }

  async getApproval(productId: string) {
    const [row] = await this.listProductApprovals({ product_id: productId })
    return row ?? null
  }

  async submitForReview(productId: string, vendorId?: string) {
    const row = await this.ensureApproval(productId)
    const oldStatus = row.approval_status
    const updated = await this.updateProductApprovals({
      id: row.id,
      approval_status: "pending_review",
      submitted_by_vendor_id: vendorId ?? row.submitted_by_vendor_id,
    })
    await this.createApprovalAudits({
      product_id: productId,
      actor_user_id: vendorId ?? null,
      action: oldStatus === "rejected" ? "resubmitted" : "submitted_for_review",
      old_status: oldStatus,
      new_status: "pending_review",
    })
    return updated
  }

  async approve(productId: string, reviewerUserId: string, note?: string) {
    const row = await this.ensureApproval(productId)
    const updated = await this.updateProductApprovals({
      id: row.id,
      approval_status: "approved",
      approved_by_user_id: reviewerUserId,
      approved_at: new Date(),
      approval_note: note ?? null,
    })
    await this.createApprovalAudits({
      product_id: productId,
      actor_user_id: reviewerUserId,
      action: "approved",
      old_status: row.approval_status,
      new_status: "approved",
      note: note ?? null,
    })
    return updated
  }

  async reject(productId: string, reviewerUserId: string, note: string) {
    const row = await this.ensureApproval(productId)
    const updated = await this.updateProductApprovals({
      id: row.id,
      approval_status: "rejected",
      rejected_by_user_id: reviewerUserId,
      rejected_at: new Date(),
      approval_note: note,
    })
    await this.createApprovalAudits({
      product_id: productId,
      actor_user_id: reviewerUserId,
      action: "rejected",
      old_status: row.approval_status,
      new_status: "rejected",
      note,
    })
    return updated
  }

  async listPendingReview(limit = 100) {
    return this.listProductApprovals({ approval_status: "pending_review" }, { take: limit })
  }

  async listAuditTrail(productId: string) {
    return this.listApprovalAudits({ product_id: productId }, { order: { created_at: "desc" } })
  }

  // For Store API filtering — returns product IDs that are publicly visible.
  async listApprovedProductIds(): Promise<string[]> {
    const rows = await this.listProductApprovals({ approval_status: "approved" })
    return rows.map((r) => r.product_id)
  }
}

export default ApprovalService
