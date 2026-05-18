import {
  createWorkflow,
  WorkflowResponse,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { assignProductToTaxonomyWorkflow } from "./assign-product-to-taxonomy"

export interface CreateProductWithTaxonomyInput {
  tenant_id: string
  taxonomy_handle: string
  core_fields: Record<string, unknown>
  custom_fields?: Record<string, unknown>
  merch_category_ids?: string[]
  product: {
    title: string
    handle: string
    description?: string
    thumbnail?: string
    status?: "draft" | "published" | "proposed" | "rejected"
    images?: { url: string }[]
    sales_channels: { id: string }[]
    options?: { title: string; values: string[] }[]
    variants?: any[]
  }
}

export const createProductWithTaxonomyWorkflow = createWorkflow(
  "create-product-with-taxonomy",
  (input: CreateProductWithTaxonomyInput) => {
    // Step 1: Create the product via the standard Medusa workflow
    const createInput = transform(input, (i) => ({
      products: [
        {
          title: i.product.title,
          handle: i.product.handle,
          description: i.product.description,
          thumbnail: i.product.thumbnail,
          status: i.product.status ?? "published",
          images: i.product.images,
          sales_channels: i.product.sales_channels,
          options: i.product.options ?? [{ title: "Default", values: ["Default"] }],
          variants: i.product.variants ?? [
            {
              title: "Default",
              manage_inventory: false,
              options: { Default: "Default" },
            },
          ],
        },
      ],
    }))
    const createdProducts = createProductsWorkflow.runAsStep({ input: createInput })

    // Step 2: Assign the taxonomy (validates core_fields, attaches category, writes metadata)
    const assignInput = transform(
      { createdProducts, input },
      ({ createdProducts, input }) => ({
        product_id: (createdProducts as any)[0].id,
        taxonomy_handle: input.taxonomy_handle,
        core_fields: input.core_fields,
        custom_fields: input.custom_fields,
      })
    )
    assignProductToTaxonomyWorkflow.runAsStep({ input: assignInput })

    return new WorkflowResponse(
      transform(createdProducts, (c) => ({ product_id: (c as any)[0].id }))
    )
  }
)
