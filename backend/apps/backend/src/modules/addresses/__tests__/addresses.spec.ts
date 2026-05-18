import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ADDRESSES_MODULE } from ".."

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe("AddressesService", () => {
      it("creates and lists addresses for a customer", async () => {
        const svc = getContainer().resolve(ADDRESSES_MODULE) as any
        const a = await svc.createForCustomer("cus_1", {
          label: "Home",
          recipient_name: "Hamza",
          phone: "+964 750 1",
          street: "Karrada, Bldg 12",
          city: "Baghdad",
          country_code: "IQ",
        })
        expect(a.label).toBe("Home")
        expect(a.is_default).toBe(false)
        const list = await svc.listForCustomer("cus_1")
        expect(list).toHaveLength(1)
      })

      it("createForCustomer with is_default flips existing default", async () => {
        const svc = getContainer().resolve(ADDRESSES_MODULE) as any
        const first = await svc.createForCustomer("cus_2", {
          label: "Home", street: "A", city: "Baghdad", country_code: "IQ", is_default: true,
        })
        const second = await svc.createForCustomer("cus_2", {
          label: "Office", street: "B", city: "Baghdad", country_code: "IQ", is_default: true,
        })
        const firstAfter = (await svc.listCustomerAddresses({ id: first.id }))[0]
        const secondAfter = (await svc.listCustomerAddresses({ id: second.id }))[0]
        expect(firstAfter.is_default).toBe(false)
        expect(secondAfter.is_default).toBe(true)
      })

      it("setDefault flips others", async () => {
        const svc = getContainer().resolve(ADDRESSES_MODULE) as any
        const a = await svc.createForCustomer("cus_3", {
          label: "A", street: "X", city: "Baghdad", country_code: "IQ", is_default: true,
        })
        const b = await svc.createForCustomer("cus_3", {
          label: "B", street: "Y", city: "Baghdad", country_code: "IQ",
        })
        await svc.setDefault(b.id, "cus_3")
        const aAfter = (await svc.listCustomerAddresses({ id: a.id }))[0]
        const bAfter = (await svc.listCustomerAddresses({ id: b.id }))[0]
        expect(aAfter.is_default).toBe(false)
        expect(bAfter.is_default).toBe(true)
      })

      it("isolates by customer_id", async () => {
        const svc = getContainer().resolve(ADDRESSES_MODULE) as any
        await svc.createForCustomer("cus_4a", { label: "X", street: "x", city: "Baghdad", country_code: "IQ" })
        await svc.createForCustomer("cus_4b", { label: "X", street: "x", city: "Baghdad", country_code: "IQ" })
        const a = await svc.listForCustomer("cus_4a")
        const b = await svc.listForCustomer("cus_4b")
        expect(a).toHaveLength(1)
        expect(b).toHaveLength(1)
        expect(a[0].id).not.toBe(b[0].id)
      })
    })
  },
})
