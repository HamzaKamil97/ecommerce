import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { createApiKeysWorkflow } from "@medusajs/medusa/core-flows"
import { TENANT_MODULE } from "../../src/modules/tenant"
import { MERCH_MODULE } from "../../src/modules/merch"

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

    describe("/store/tenants/:slug/merch-categories", () => {
      it("returns the shop's merch categories", async () => {
        const tenantSvc = getContainer().resolve(TENANT_MODULE) as any
        const merchSvc = getContainer().resolve(MERCH_MODULE) as any
        const [t] = await tenantSvc.createTenants([{
          slug: `s-${Date.now()}`,
          name: "Test Shop",
          approval_status: "approved",
        }])
        await merchSvc.createForTenant(t.id, { name: "Pizzas", position: 1 })
        await merchSvc.createForTenant(t.id, { name: "Burgers", position: 2 })

        const r = await api.get(`/store/tenants/${t.slug}/merch-categories`, authHeaders())
        expect(r.status).toBe(200)
        expect(r.data.tenant.slug).toBe(t.slug)
        expect(r.data.merch_categories.map((c: any) => c.name)).toEqual(["Pizzas", "Burgers"])
      })

      it("404s for unknown shop slug", async () => {
        const r = await api.get("/store/tenants/nope-shop/merch-categories", authHeaders()).catch((e) => e.response)
        expect(r.status).toBe(404)
      })
    })
  },
})
