import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveVendorContext } from "../../../_helpers"
import { APPROVAL_MODULE } from "../../../../../modules/approval"
import type ApprovalService from "../../../../../modules/approval/service"

// POST /vendor/products/{id}/submit    Submit for reviewer approval

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const ctx = await resolveVendorContext(req, res)
  if (!ctx) return
  const productModule = req.scope.resolve("product") as any
  const product = await productModule.retrieveProduct(req.params.id, { relations: ["sales_channels"] }).catch(() => null)
  if (
    !product ||
    !(product.sales_channels ?? []).some((sc: any) => sc.id === ctx.tenant.sales_channel_id)
  ) {
    return res.status(404).json({ error: "product not found in your shop" })
  }

  const approval = req.scope.resolve(APPROVAL_MODULE) as ApprovalService
  const updated = await approval.submitForReview(req.params.id, ctx.vendor.id)
  res.json({ approval: updated })
}
