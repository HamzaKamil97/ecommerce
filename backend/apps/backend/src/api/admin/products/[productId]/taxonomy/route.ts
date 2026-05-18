import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { assignProductToTaxonomyWorkflow } from "../../../../../workflows/assign-product-to-taxonomy"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body as any) || {}
  if (!body.taxonomy_handle) {
    return res.status(400).json({ error: "taxonomy_handle is required" })
  }
  if (!body.core_fields || typeof body.core_fields !== "object") {
    return res.status(400).json({ error: "core_fields must be an object" })
  }
  try {
    const { result } = await assignProductToTaxonomyWorkflow(req.scope).run({
      input: {
        product_id: req.params.productId,
        taxonomy_handle: body.taxonomy_handle,
        core_fields: body.core_fields,
        custom_fields: body.custom_fields,
      },
    })
    res.json({ product_id: result.product_id })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
}
