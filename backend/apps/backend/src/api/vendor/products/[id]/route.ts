import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveVendorContext } from "../../_helpers"

// GET    /vendor/products/{id}      retrieve (must belong to vendor's tenant)
// POST   /vendor/products/{id}      update
// DELETE /vendor/products/{id}      soft-delete

async function assertOwns(req: MedusaRequest, productId: string, tenantSalesChannelId: string | null) {
  if (!tenantSalesChannelId) return false
  const productModule = req.scope.resolve("product") as any
  const product = await productModule.retrieveProduct(productId, { relations: ["sales_channels"] }).catch(() => null)
  if (!product) return false
  return (product.sales_channels ?? []).some((sc: any) => sc.id === tenantSalesChannelId)
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const ctx = await resolveVendorContext(req, res)
  if (!ctx) return
  const ok = await assertOwns(req, req.params.id, ctx.tenant.sales_channel_id)
  if (!ok) return res.status(404).json({ error: "product not found in your shop" })
  const productModule = req.scope.resolve("product") as any
  const product = await productModule.retrieveProduct(req.params.id, { relations: ["variants", "images", "options"] })
  res.json({ product })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const ctx = await resolveVendorContext(req, res)
  if (!ctx) return
  const ok = await assertOwns(req, req.params.id, ctx.tenant.sales_channel_id)
  if (!ok) return res.status(404).json({ error: "product not found in your shop" })

  const body = (req.body as any) || {}
  const productModule = req.scope.resolve("product") as any
  const updated = await productModule.updateProducts({
    id: req.params.id,
    title: body.title,
    description: body.description,
    thumbnail: body.thumbnail,
    status: body.status,
  })

  if (body.vertical_fields) {
    const verticalFields = req.scope.resolve("vertical_fields") as any
    await verticalFields.setForProduct(req.params.id, ctx.tenant.vertical, body.vertical_fields).catch(() => {})
  }

  res.json({ product: updated })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const ctx = await resolveVendorContext(req, res)
  if (!ctx) return
  const ok = await assertOwns(req, req.params.id, ctx.tenant.sales_channel_id)
  if (!ok) return res.status(404).json({ error: "product not found in your shop" })
  const productModule = req.scope.resolve("product") as any
  await productModule.deleteProducts(req.params.id)
  res.json({ id: req.params.id, deleted: true })
}
