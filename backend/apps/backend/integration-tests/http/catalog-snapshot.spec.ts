import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { createUserAccountWorkflow } from "@medusajs/core-flows"

async function bootstrapAdmin(api: any, container: any): Promise<{ headers: Record<string, string> }> {
  const email = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`
  const password = "supersecret1"
  const registerRes = await api
    .post(`/auth/user/emailpass/register`, { email, password })
    .catch((e: any) => e.response)
  if (registerRes.status !== 200 || !registerRes.data?.token) {
    throw new Error(`Admin registration failed (${registerRes.status})`)
  }
  const [, payloadB64] = (registerRes.data.token as string).split(".")
  const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"))
  await createUserAccountWorkflow(container).run({
    input: { authIdentityId: payload.auth_identity_id, userData: { email, first_name: "Test", last_name: "Admin" } },
  })
  const loginRes = await api.post(`/auth/user/emailpass`, { email, password })
  return { headers: { Authorization: `Bearer ${loginRes.data.token}` } }
}

jest.setTimeout(120000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    const vendorId = "v_test"
    let adminHeaders: Record<string, string>

    beforeEach(async () => {
      const { headers } = await bootstrapAdmin(api, getContainer())
      adminHeaders = headers
    })

    describe("GET /admin/pos-terminal/catalog-snapshot", () => {
      it("returns the real price_minor (not 0) for a created product", async () => {
        const createRes = await api
          .post(
            "/admin/catalog/manager-products",
            { vendor_id: vendorId, title: "Snapshot Price Probe", price_minor: 4250, currency_code: "iqd" },
            { headers: adminHeaders },
          )
          .catch((e: any) => e.response)
        expect(createRes.status).toBe(201)

        const res = await api.get(
          `/admin/pos-terminal/catalog-snapshot?vendor_id=${vendorId}`,
          { headers: adminHeaders },
        )
        expect(res.status).toBe(200)
        const item = res.data.items.find((i: any) => i.name.startsWith("Snapshot Price Probe"))
        expect(item).toBeTruthy()
        expect(item.price_minor).toBe(4250)
        expect(item).toHaveProperty("merch_category_id")
        expect(item).toHaveProperty("category_name")
        expect(item).toHaveProperty("thumb_emoji")
      })
    })
  },
})
