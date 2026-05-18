import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { APPROVAL_MODULE } from "../modules/approval"
import type ApprovalService from "../modules/approval/service"

// When a product is created, attach an approval row.
// Admin-created products → "approved" (so admin can publish directly).
// Vendor-created products (carrying metadata.created_by_vendor_id) → "draft".

export default async function approvalOnProductCreated({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const productId = event.data.id
  if (!productId) return

  const approval = container.resolve(APPROVAL_MODULE) as ApprovalService
  const productModule = container.resolve("product")
  const product = await productModule.retrieveProduct(productId).catch(() => null as any)

  const vendorId = (product?.metadata as any)?.created_by_vendor_id
  const status = vendorId ? "draft" : "approved"
  await approval.ensureApproval(productId, status, vendorId)
}

export const config: SubscriberConfig = {
  event: "product.created",
}
