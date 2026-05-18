import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { assignProductToTaxonomyWorkflow } from "../../../workflows/assign-product-to-taxonomy"
import { syncTaxonomySeedWorkflow } from "../../../workflows/sync-taxonomy-seed"

async function createTestProduct(getContainer: any) {
  const productSvc = getContainer().resolve(Modules.PRODUCT) as any
  const [p] = await productSvc.createProducts([{
    title: "Test Pizza",
    handle: `test-pizza-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    status: "published",
  }])
  return p
}

/**
 * Medusa v2 workflow errors are serialized to plain objects by the orchestrator
 * (via serializeError), so Jest's .rejects.toThrow() doesn't work since it requires
 * an Error instance. This helper manually checks the rejected value's message.
 */
async function expectWorkflowError(promise: Promise<any>, pattern: RegExp) {
  let threw = false
  let errorMsg = ""
  try {
    await promise
  } catch (e: any) {
    threw = true
    errorMsg = e?.message ?? String(e)
  }
  expect(threw).toBe(true)
  expect(errorMsg).toMatch(pattern)
}

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe("assignProductToTaxonomyWorkflow", () => {
      it("assigns happy-path core_fields and stores them in metadata", async () => {
        await syncTaxonomySeedWorkflow(getContainer()).run({})
        const p = await createTestProduct(getContainer)
        await assignProductToTaxonomyWorkflow(getContainer()).run({
          input: {
            product_id: p.id,
            taxonomy_handle: "food.pizza",
            core_fields: { size_in: "12", prep_min: 18, toppings: ["basil"], allergens: ["gluten"] },
          },
        })
        const productSvc = getContainer().resolve(Modules.PRODUCT) as any
        const [updated] = await productSvc.listProducts(
          { id: p.id },
          { relations: ["categories"] }
        )
        expect(updated.metadata.core_fields.size_in).toBe("12")
        expect(updated.metadata.core_fields.prep_min).toBe(18)
        expect(updated.categories.some((c: any) => c.handle === "food.pizza")).toBe(true)
      })

      it("rejects unknown taxonomy handle", async () => {
        const p = await createTestProduct(getContainer)
        await expectWorkflowError(
          assignProductToTaxonomyWorkflow(getContainer()).run({
            input: { product_id: p.id, taxonomy_handle: "not.a.real.handle", core_fields: {} },
          }),
          /Unknown taxonomy handle/
        )
      })

      it("rejects missing required core_field", async () => {
        const p = await createTestProduct(getContainer)
        await expectWorkflowError(
          assignProductToTaxonomyWorkflow(getContainer()).run({
            input: { product_id: p.id, taxonomy_handle: "food.pizza", core_fields: { prep_min: 12 } },
          }),
          /size_in is required/
        )
      })

      it("rejects custom_fields key collision with core_fields", async () => {
        const p = await createTestProduct(getContainer)
        await expectWorkflowError(
          assignProductToTaxonomyWorkflow(getContainer()).run({
            input: {
              product_id: p.id,
              taxonomy_handle: "food.pizza",
              core_fields: { size_in: "12", prep_min: 12 },
              custom_fields: { size_in: "BIG" },
            },
          }),
          /collide with core_fields/
        )
      })
    })
  },
})
