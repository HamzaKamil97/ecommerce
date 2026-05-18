import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { MERCH_MODULE } from "../index"

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe("MerchService", () => {
      it("creates and lists a merch category", async () => {
        const merch = getContainer().resolve(MERCH_MODULE) as any
        const cat = await merch.createForTenant("tnt_test_1", { name: "Pizzas" })
        expect(cat.handle).toBe("pizzas")
        expect(cat.tenant_id).toBe("tnt_test_1")
        const list = await merch.listForTenant("tnt_test_1")
        expect(list).toHaveLength(1)
        expect(list[0].name).toBe("Pizzas")
      })

      it("rejects duplicate handle for the same tenant", async () => {
        const merch = getContainer().resolve(MERCH_MODULE) as any
        await merch.createForTenant("tnt_test_2", { name: "Burgers" })
        await expect(merch.createForTenant("tnt_test_2", { name: "Burgers" }))
          .rejects.toThrow(/already exists/)
      })

      it("allows same handle across different tenants", async () => {
        const merch = getContainer().resolve(MERCH_MODULE) as any
        await merch.createForTenant("tnt_test_3a", { name: "Snacks" })
        await merch.createForTenant("tnt_test_3b", { name: "Snacks" })
        const a = await merch.listForTenant("tnt_test_3a")
        const b = await merch.listForTenant("tnt_test_3b")
        expect(a).toHaveLength(1)
        expect(b).toHaveLength(1)
      })

      it("orders by position then created_at", async () => {
        const merch = getContainer().resolve(MERCH_MODULE) as any
        await merch.createForTenant("tnt_test_4", { name: "Second", position: 2 })
        await merch.createForTenant("tnt_test_4", { name: "First",  position: 1 })
        const list = await merch.listForTenant("tnt_test_4")
        expect(list.map((c: any) => c.name)).toEqual(["First", "Second"])
      })
    })
  },
})
