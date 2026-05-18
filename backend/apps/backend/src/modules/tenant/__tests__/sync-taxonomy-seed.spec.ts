import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { syncTaxonomySeedWorkflow } from "../../../workflows/sync-taxonomy-seed"
import { flattenTree } from "../../../taxonomy/tree"
import { Modules } from "@medusajs/framework/utils"

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe("syncTaxonomySeedWorkflow", () => {
      it("creates every node on a clean DB", async () => {
        const { result } = await syncTaxonomySeedWorkflow(getContainer()).run({})
        const expected = flattenTree().length
        expect(result.created).toBe(expected)
        expect(result.updated).toBe(0)
        expect(result.total).toBe(expected)
      })

      it("is idempotent — second run reports everything unchanged", async () => {
        await syncTaxonomySeedWorkflow(getContainer()).run({})
        const { result } = await syncTaxonomySeedWorkflow(getContainer()).run({})
        expect(result.created).toBe(0)
        expect(result.updated).toBe(0)
        expect(result.unchanged).toBe(flattenTree().length)
      })

      it("attaches schema_handle metadata only on leaves", async () => {
        await syncTaxonomySeedWorkflow(getContainer()).run({})
        const productSvc = getContainer().resolve(Modules.PRODUCT) as any
        const all = await productSvc.listProductCategories(
          { handle: ["food", "food.pizza"] },
          { take: 10, select: ["id", "handle", "name", "parent_category_id", "metadata"] }
        )
        const food = all.find((c: any) => c.handle === "food")
        const pizza = all.find((c: any) => c.handle === "food.pizza")
        expect(food).toBeDefined()
        expect(pizza).toBeDefined()
        expect(food.metadata?.schema_handle ?? null).toBeFalsy()
        expect(pizza.metadata?.schema_handle).toBe("food.pizza")
      })
    })
  },
})
