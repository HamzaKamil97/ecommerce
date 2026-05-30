import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { createUserAccountWorkflow } from "@medusajs/core-flows"

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

  const registerRes = await api
    .post(`/auth/user/emailpass/register`, { email, password })
    .catch((e: any) => e.response)

  if (registerRes.status !== 200 || !registerRes.data?.token) {
    throw new Error(
      `Admin registration failed (${registerRes.status}): ${JSON.stringify(registerRes.data)}`
    )
  }

  const rawToken: string = registerRes.data.token
  const [, payloadB64] = rawToken.split(".")
  const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"))
  const authIdentityId: string = payload.auth_identity_id

  await createUserAccountWorkflow(container).run({
    input: {
      authIdentityId,
      userData: { email, first_name: "Test", last_name: "Admin" },
    },
  })

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

    describe("POST /admin/catalog/manager-products", () => {
      it("creates a manager product and it appears in the list with merch link + stock", async () => {
        const create = await api
          .post(
            "/admin/catalog/manager-products",
            {
              vendor_id: "v_cp",
              title: "Pinar Milk 1L",
              price_minor: 1500,
              currency_code: "iqd",
              merch_category_id: "mc_dairy",
              sku: "PM1",
              barcode: "8690",
              initial_on_hand: 12,
              cost_price_minor: 1100,
              brand: "Pinar",
              supplier_name: "ACME",
              tags: ["halal"],
              low_stock_threshold: 3,
              internal_notes: "aisle 4",
              schema_fields: { pack_size: "1L" },
            },
            { headers: adminHeaders }
          )
          .catch((e: any) => e.response)

        expect(create.status).toBe(201)
        expect(create.data.product.id).toBeDefined()

        const list = await api.get(
          "/admin/catalog/manager-products?vendor_id=v_cp",
          { headers: adminHeaders }
        )
        const p = list.data.products.find((x: any) => x.title === "Pinar Milk 1L")
        expect(p).toBeDefined()
        expect(p).toMatchObject({
          merch_category_id: "mc_dairy",
          sku: "PM1",
          price_minor: 1500,
          currency_code: "iqd",
          stock_qty: 12,
        })
      })

      it("400 when required fields missing", async () => {
        const r = await api
          .post(
            "/admin/catalog/manager-products",
            { vendor_id: "v_x" },
            { headers: adminHeaders }
          )
          .catch((e: any) => e.response)
        expect(r.status).toBe(400)
      })
    })
  },
})
