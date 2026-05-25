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

    describe("Store WMS routes", () => {
      it("GET /store/wms/shops-nearby returns shops in radius", async () => {
        const svc = getContainer().resolve("wmsService") as any
        await svc.upsertShopLocation({
          vendor_id: "v_store_a",
          lat: 33.3152,
          lng: 44.3661,
          delivery_radius_km: 5,
          address_text: "Karrada",
        })
        const res = await api.get(
          "/store/wms/shops-nearby?lat=33.3152&lng=44.3661&radius_km=10",
          authHeaders(),
        )
        expect(res.status).toBe(200)
        expect(Array.isArray(res.data.shops)).toBe(true)
        const ids = res.data.shops.map((s: any) => s.vendor_id)
        expect(ids).toContain("v_store_a")
      })

      it("GET /store/wms/shops-nearby returns 400 when lat/lng missing", async () => {
        const res = await api
          .get("/store/wms/shops-nearby?radius_km=10", authHeaders())
          .catch((e: any) => e.response)
        expect(res.status).toBe(400)
      })

      it("POST /store/wms/availability returns per-line availability", async () => {
        const svc = getContainer().resolve("wmsService") as any
        await svc.incrementStock({
          vendor_id: "v_avail",
          variant_id: "var_avail_a",
          qty: 5,
          type: "restock",
        })
        const res = await api.post(
          "/store/wms/availability",
          {
            vendor_id: "v_avail",
            lines: [
              { variant_id: "var_avail_a", qty: 2 },
              { variant_id: "var_avail_b", qty: 1 },
            ],
          },
          authHeaders(),
        )
        expect(res.status).toBe(200)
        const map: Record<string, any> = Object.fromEntries(
          res.data.lines.map((l: any) => [l.variant_id, l]),
        )
        expect(map["var_avail_a"].available).toBe(true)
        expect(map["var_avail_a"].available_qty).toBe(5)
        expect(map["var_avail_a"].requested).toBe(2)
        expect(map["var_avail_b"].available).toBe(false)
        expect(map["var_avail_b"].available_qty).toBe(0)
      })

      it("POST /store/wms/availability returns 400 when body missing required fields", async () => {
        const res = await api
          .post("/store/wms/availability", { lines: [] }, authHeaders())
          .catch((e: any) => e.response)
        expect(res.status).toBe(400)
        const res2 = await api
          .post("/store/wms/availability", { vendor_id: "v" }, authHeaders())
          .catch((e: any) => e.response)
        expect(res2.status).toBe(400)
      })
    })
  },
})
