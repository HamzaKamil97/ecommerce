import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { createApiKeysWorkflow } from "@medusajs/medusa/core-flows"

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("/store/taxonomy", () => {
      // The test runner tears down the DB after each test, so we create a fresh
      // publishable key in beforeEach (not beforeAll) so it survives each run.
      let publishableKey: string

      beforeEach(async () => {
        const container = getContainer()!
        const { result } = await createApiKeysWorkflow(container).run({
          input: {
            api_keys: [
              {
                title: "Test Publishable Key",
                type: "publishable",
                created_by: "",
              },
            ],
          },
        })
        publishableKey = result[0].token
      })

      it("GET /tree returns the full hierarchy", async () => {
        const r = await api.get("/store/taxonomy/tree", {
          headers: { "x-publishable-api-key": publishableKey },
        })
        expect(r.status).toBe(200)
        expect(Array.isArray(r.data.tree)).toBe(true)
        const food = r.data.tree.find((n: any) => n.handle === "food")
        expect(food).toBeDefined()
        expect(food.children.some((c: any) => c.handle === "food.pizza")).toBe(true)
      })

      it("GET /leaves/:handle returns schema for a known leaf", async () => {
        const r = await api.get("/store/taxonomy/leaves/food.pizza", {
          headers: { "x-publishable-api-key": publishableKey },
        })
        expect(r.status).toBe(200)
        expect(r.data.schema.handle).toBe("food.pizza")
        expect(r.data.schema.core_fields.some((f: any) => f.key === "size_in")).toBe(true)
      })

      it("GET /leaves/:handle returns 404 for non-leaf", async () => {
        const r = await api
          .get("/store/taxonomy/leaves/food", {
            headers: { "x-publishable-api-key": publishableKey },
          })
          .catch((e: any) => e.response)
        expect(r.status).toBe(404)
      })

      it("GET /leaves/:handle returns 404 for unknown handle", async () => {
        const r = await api
          .get("/store/taxonomy/leaves/nope", {
            headers: { "x-publishable-api-key": publishableKey },
          })
          .catch((e: any) => e.response)
        expect(r.status).toBe(404)
      })
    })
  },
})
