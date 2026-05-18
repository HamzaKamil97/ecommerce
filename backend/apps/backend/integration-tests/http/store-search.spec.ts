import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { createApiKeysWorkflow } from "@medusajs/medusa/core-flows"

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let pubKey: string

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
      pubKey = result[0].token
    })

    function authHeaders() {
      return { headers: { "x-publishable-api-key": pubKey } }
    }

    describe("/store/products/search", () => {
      it("returns empty array on empty query when no products match", async () => {
        const r = await api.get(
          "/store/products/search?q=xyzabc123",
          authHeaders()
        )
        expect(r.status).toBe(200)
        expect(Array.isArray(r.data.results)).toBe(true)
      })

      it("matches by title", async () => {
        const productSvc = getContainer().resolve("product") as any
        const uniqueTitle = `UniqueSearchableTitle-${Date.now()}`
        await productSvc.createProducts([
          {
            title: uniqueTitle,
            handle: `unique-search-${Date.now()}`,
            status: "published",
          },
        ])
        const r = await api.get(
          `/store/products/search?q=${encodeURIComponent(uniqueTitle)}`,
          authHeaders()
        )
        expect(r.status).toBe(200)
        expect(r.data.results.length).toBeGreaterThan(0)
      })
    })
  },
})
