import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { getSchemaByHandle } from "../taxonomy/registry"
import { validateCoreFields } from "../taxonomy/validate"

export interface AssignInput {
  product_id: string
  taxonomy_handle: string
  core_fields: Record<string, unknown>
  custom_fields?: Record<string, unknown>
}

const assignStep = createStep(
  "assign-product-to-taxonomy",
  async (input: AssignInput, { container }): Promise<StepResponse<{ product_id: string }>> => {
    const productSvc = container.resolve(Modules.PRODUCT) as any

    // 1. Resolve leaf schema
    const schema = getSchemaByHandle(input.taxonomy_handle)
    if (!schema) {
      throw new Error(`Unknown taxonomy handle: ${input.taxonomy_handle}`)
    }

    // 2. Validate core_fields
    const result = validateCoreFields(schema, input.core_fields)
    if (!result.ok) {
      const detail = result.errors.map((e) => `${e.key}: ${e.message}`).join("; ")
      throw new Error(`core_fields validation failed: ${detail}`)
    }

    // 3. Validate custom_fields: no collisions with core_fields keys
    if (input.custom_fields) {
      const coreKeys = new Set(schema.core_fields.map((f) => f.key))
      const collisions = Object.keys(input.custom_fields).filter((k) => coreKeys.has(k))
      if (collisions.length > 0) {
        throw new Error(`custom_fields key(s) collide with core_fields: ${collisions.join(", ")}`)
      }
    }

    // 4. Resolve the product_category id from the taxonomy handle
    const [taxonomyCat] = await productSvc.listProductCategories({ handle: input.taxonomy_handle })
    if (!taxonomyCat) {
      throw new Error(`product_category for handle ${input.taxonomy_handle} not found — has the seed run?`)
    }

    // 5. Fetch existing product + its current categories
    const [product] = await productSvc.listProducts(
      { id: input.product_id },
      { relations: ["categories"] }
    )
    if (!product) {
      throw new Error(`Product ${input.product_id} not found`)
    }
    const otherCategoryIds = (product.categories ?? [])
      .filter((c: any) => c.metadata?.is_taxonomy !== true)
      .map((c: any) => c.id)

    // 6. Update product
    await productSvc.updateProducts(input.product_id, {
      metadata: {
        ...(product.metadata ?? {}),
        core_fields: input.core_fields,
        custom_fields: input.custom_fields ?? {},
      },
      category_ids: [taxonomyCat.id, ...otherCategoryIds],
    })

    return new StepResponse({ product_id: input.product_id })
  }
)

export const assignProductToTaxonomyWorkflow = createWorkflow(
  "assign-product-to-taxonomy",
  (input: AssignInput) => {
    const out = assignStep(input)
    return new WorkflowResponse(out)
  }
)
