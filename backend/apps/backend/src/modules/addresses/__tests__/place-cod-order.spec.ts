import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { placeCodOrderWorkflow } from "../../../workflows/place-cod-order"
import { syncTaxonomySeedWorkflow } from "../../../workflows/sync-taxonomy-seed"
import { TENANT_MODULE } from "../../tenant"
import { ADDRESSES_MODULE } from ".."
import { createSalesChannelsWorkflow, createProductsWorkflow, createRegionsWorkflow } from "@medusajs/medusa/core-flows"

/**
 * Medusa v2 workflow errors are serialized to plain objects by the orchestrator
 * (via serializeError), so Jest's .rejects.toThrow() doesn't work.
 * This helper manually checks the rejected/thrown value's message.
 */
async function expectWorkflowError(promise: Promise<any>, pattern?: RegExp) {
  let threw = false
  let errorMsg = ""
  try {
    await promise
  } catch (e: any) {
    threw = true
    errorMsg = e?.message ?? String(e)
  }
  expect(threw).toBe(true)
  if (pattern) {
    expect(errorMsg).toMatch(pattern)
  }
}

async function createTestCustomer(container: any, email: string) {
  const customerSvc = container.resolve(Modules.CUSTOMER) as any
  const [customer] = await customerSvc.createCustomers([{
    email,
    first_name: "Test",
    last_name: "Customer",
  }])
  return customer
}

async function setupShopWithProduct(container: any) {
  const { result: [channel] } = await createSalesChannelsWorkflow(container).run({
    input: { salesChannelsData: [{ name: `Test ${Date.now()}` }] },
  })
  // Create a region with IQD currency — required by createCartWorkflow (findOneOrAnyRegionStep)
  const { result: [region] } = await createRegionsWorkflow(container).run({
    input: {
      regions: [{ name: `Iraq ${Date.now()}`, currency_code: "iqd", countries: [] }],
    },
  })
  const tenantSvc = container.resolve(TENANT_MODULE) as any
  const [tenant] = await tenantSvc.createTenants([{
    slug: `t-${Date.now()}`,
    name: "Test Shop",
    vertical: "food",
    display_currency: "IQD",
    sales_channel_id: channel.id,
    approval_status: "approved",
  }])
  const { result: [created] } = await createProductsWorkflow(container).run({
    input: {
      products: [{
        title: "Test Pizza",
        handle: `test-pizza-${Date.now()}`,
        status: "published",
        sales_channels: [{ id: channel.id }],
        options: [{ title: "Default", values: ["Default"] }],
        variants: [{
          title: "Default",
          manage_inventory: false,
          prices: [{ amount: 15000, currency_code: "iqd" }],
          options: { Default: "Default" },
        }],
      }],
    },
  })
  return { tenant, channel, region, product: created, variant: created.variants[0] }
}

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    beforeAll(async () => {
      await syncTaxonomySeedWorkflow(getContainer()).run({})
    })

    describe("placeCodOrderWorkflow", () => {
      it("places an order with inline address (save=true)", async () => {
        const customer = await createTestCustomer(getContainer(), `pod1-${Date.now()}@test.com`)
        const { tenant, region, variant } = await setupShopWithProduct(getContainer())
        const { result } = await placeCodOrderWorkflow(getContainer()).run({
          input: {
            customer_id: customer.id,
            shop_slug: tenant.slug,
            region_id: region.id,
            inline_address: {
              label: "Home", recipient_name: "Hamza", phone: "+964 750 1",
              street: "Karrada 12", city: "Baghdad", country_code: "IQ",
              save: true,
            },
            items: [{ variant_id: variant.id, qty: 2 }],
            shop_notes: "No onions",
            delivery_notes: "Blue gate",
            coupon_code: null,
            currency_code: "iqd",
          },
        })
        expect(result.order_id).toBeTruthy()
        expect(result.display_id).toBeTruthy()
      })

      it("places an order with saved address_id", async () => {
        const customer = await createTestCustomer(getContainer(), `pod2-${Date.now()}@test.com`)
        const { tenant, region, variant } = await setupShopWithProduct(getContainer())
        const addrSvc = getContainer().resolve(ADDRESSES_MODULE) as any
        const addr = await addrSvc.createForCustomer(customer.id, {
          label: "Home", street: "x", city: "Baghdad", country_code: "IQ",
        })
        const { result } = await placeCodOrderWorkflow(getContainer()).run({
          input: {
            customer_id: customer.id,
            shop_slug: tenant.slug,
            region_id: region.id,
            address_id: addr.id,
            items: [{ variant_id: variant.id, qty: 1 }],
            currency_code: "iqd",
          },
        })
        expect(result.order_id).toBeTruthy()
      })

      it("rejects when neither address_id nor inline_address provided", async () => {
        const customer = await createTestCustomer(getContainer(), `pod3-${Date.now()}@test.com`)
        const { tenant, variant } = await setupShopWithProduct(getContainer())
        await expectWorkflowError(
          placeCodOrderWorkflow(getContainer()).run({
            input: {
              customer_id: customer.id,
              shop_slug: tenant.slug,
              items: [{ variant_id: variant.id, qty: 1 }],
              currency_code: "iqd",
            },
          })
        )
      })

      it("rejects unknown shop", async () => {
        const customer = await createTestCustomer(getContainer(), `pod4-${Date.now()}@test.com`)
        await expectWorkflowError(
          placeCodOrderWorkflow(getContainer()).run({
            input: {
              customer_id: customer.id,
              shop_slug: "nope-shop",
              inline_address: { street: "x", city: "Baghdad", country_code: "IQ" },
              items: [{ variant_id: "fake_variant_id", qty: 1 }],
              currency_code: "iqd",
            },
          }),
          /not found/
        )
      })
    })
  },
})
