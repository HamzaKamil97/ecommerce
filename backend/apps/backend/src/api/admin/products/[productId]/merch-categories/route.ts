import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { MERCH_MODULE } from "../../../../../modules/merch"
import { TENANT_MODULE } from "../../../../../modules/tenant"

// PUT — replace the full set of merch categories on a product
// Body: { merch_category_ids: string[] }
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const productSvc = req.scope.resolve(Modules.PRODUCT) as any
  const merch = req.scope.resolve(MERCH_MODULE) as any
  const tenantSvc = req.scope.resolve(TENANT_MODULE) as any
  const body = (req.body as any) || {}
  const ids: string[] = Array.isArray(body.merch_category_ids) ? body.merch_category_ids : []

  const product = await productSvc.retrieveProduct(req.params.productId, { relations: ["sales_channels", "categories"] })
  const channelIds = (product.sales_channels ?? []).map((c: any) => c.id)
  if (channelIds.length === 0) {
    return res.status(400).json({ error: "Product has no sales_channel — cannot resolve tenant" })
  }

  const cats = ids.length > 0 ? await merch.listMerchCategories({ id: ids }) : []
  for (const cat of cats) {
    const tenant = await tenantSvc.retrieveTenant(cat.tenant_id)
    if (!channelIds.includes(tenant.sales_channel_id)) {
      return res.status(403).json({ error: `merch_category ${cat.id} not owned by product's tenant` })
    }
  }
  if (cats.length !== ids.length) {
    return res.status(400).json({ error: "Some merch_category_ids do not exist" })
  }

  const taxonomyIds = (product.categories ?? [])
    .filter((c: any) => c.metadata?.is_taxonomy === true)
    .map((c: any) => c.id)
  await productSvc.updateProducts(req.params.productId, {
    category_ids: [...taxonomyIds, ...ids],
  })
  res.json({ product_id: req.params.productId, merch_category_ids: ids })
}
