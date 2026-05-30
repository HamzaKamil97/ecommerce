import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  createUserAccountWorkflow,
  createProductsWorkflow,
} from "@medusajs/core-flows"

// Admin auth setup for Medusa v2 integration tests.
// Steps:
//  1. Register a new emailpass identity via HTTP  → get registration token
//  2. Use createUserAccountWorkflow with the auth_identity_id encoded in the JWT to
//     create the admin User record.
//  3. Login via POST /auth/user/emailpass to get a real session token.
async function bootstrapAdmin(
  api: any,
  container: any
): Promise<{ headers: Record<string, string> }> {
  const email = `admin-${Date.now()}@test.com`
  const password = "supersecret1"

  // Step 1 — register identity (this creates an auth_identity row)
  const registerRes = await api
    .post(`/auth/user/emailpass/register`, { email, password })
    .catch((e: any) => e.response)

  if (registerRes.status !== 200 || !registerRes.data?.token) {
    throw new Error(
      `Admin registration failed (${registerRes.status}): ${JSON.stringify(registerRes.data)}`
    )
  }

  // Decode the JWT to pull out auth_identity_id (it is in the payload, no verification needed here)
  const rawToken: string = registerRes.data.token
  const [, payloadB64] = rawToken.split(".")
  const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"))
  const authIdentityId: string = payload.auth_identity_id

  // Step 2 — create the user record and attach the auth identity
  await createUserAccountWorkflow(container).run({
    input: {
      authIdentityId,
      userData: { email, first_name: "Test", last_name: "Admin" },
    },
  })

  // Step 3 — login to get a real session token
  const loginRes = await api
    .post(`/auth/user/emailpass`, { email, password })
    .catch((e: any) => e.response)

  if (loginRes.status !== 200 || !loginRes.data?.token) {
    throw new Error(
      `Admin login failed (${loginRes.status}): ${JSON.stringify(loginRes.data)}`
    )
  }

  return { headers: { Authorization: `Bearer ${loginRes.data.token}` } }
}

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let adminHeaders: Record<string, string>

    beforeEach(async () => {
      const { headers } = await bootstrapAdmin(api, getContainer())
      adminHeaders = headers
    })

    describe("/admin/catalog/manager-products", () => {
      it("lists vendor products with merch link + card fields", async () => {
        // Use createProductsWorkflow so the pricing module links are created
        // (product.createProducts() alone does not write to product_variant_price_set)
        const { result: [created] } = await createProductsWorkflow(getContainer()).run({
          input: {
            products: [
              {
                title: "Milk 1L",
                status: "published",
                metadata: { created_by_vendor_id: "v_mp", merch_category_id: "mc_1" },
                options: [{ title: "Default", values: ["Default"] }],
                variants: [
                  {
                    title: "Default",
                    sku: "S1",
                    barcode: "B1",
                    manage_inventory: false,
                    prices: [{ amount: 1500, currency_code: "iqd" }],
                    options: { Default: "Default" },
                  },
                ],
              },
            ],
          },
        })
        const r = await api.get(
          "/admin/catalog/manager-products?vendor_id=v_mp",
          { headers: adminHeaders }
        )
        expect(r.status).toBe(200)
        const p = r.data.products.find((x: any) => x.title === "Milk 1L")
        expect(p).toBeDefined()
        expect(p).toMatchObject({
          merch_category_id: "mc_1",
          sku: "S1",
          barcode: "B1",
          price_minor: 1500,
        })
        expect(p).toHaveProperty("stock_qty")
        expect(p).toHaveProperty("variant_id")
      })

      it("400 when vendor_id missing", async () => {
        const r = await api
          .get("/admin/catalog/manager-products", { headers: adminHeaders })
          .catch((e: any) => e.response)
        expect(r.status).toBe(400)
      })
    })
  },
})
