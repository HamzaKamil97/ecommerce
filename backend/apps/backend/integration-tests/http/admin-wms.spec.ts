import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { createUserAccountWorkflow } from "@medusajs/core-flows"

// Admin auth bootstrap (mirrors integration-tests/http/admin-merch.spec.ts).
async function bootstrapAdmin(
  api: any,
  container: any,
): Promise<{ headers: Record<string, string> }> {
  const email = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`
  const password = "supersecret1"

  const registerRes = await api
    .post(`/auth/user/emailpass/register`, { email, password })
    .catch((e: any) => e.response)
  if (registerRes.status !== 200 || !registerRes.data?.token) {
    throw new Error(
      `Admin registration failed (${registerRes.status}): ${JSON.stringify(registerRes.data)}`,
    )
  }
  const rawToken: string = registerRes.data.token
  const [, payloadB64] = rawToken.split(".")
  const payload = JSON.parse(
    Buffer.from(payloadB64, "base64url").toString("utf-8"),
  )
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
      `Admin login failed (${loginRes.status}): ${JSON.stringify(loginRes.data)}`,
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

    describe("Admin WMS routes", () => {
      it("GET /admin/wms/stock?vendor_id&variant_id returns snapshot", async () => {
        const svc = getContainer().resolve("wmsService") as any
        await svc.incrementStock({
          vendor_id: "v_api",
          variant_id: "var_api",
          qty: 7,
          type: "restock",
        })
        const res = await api.get(
          "/admin/wms/stock?vendor_id=v_api&variant_id=var_api",
          { headers: adminHeaders },
        )
        expect(res.status).toBe(200)
        expect(res.data.on_hand).toBe(7)
        expect(res.data.reserved).toBe(0)
        expect(res.data.available).toBe(7)
      })

      it("GET /admin/wms/stock returns 400 when params missing", async () => {
        const res = await api
          .get("/admin/wms/stock?vendor_id=v_api", { headers: adminHeaders })
          .catch((e: any) => e.response)
        expect(res.status).toBe(400)
      })

      it("POST /admin/wms/stock with positive qty increments", async () => {
        const res = await api.post(
          "/admin/wms/stock",
          {
            vendor_id: "v_api",
            variant_id: "var_api2",
            qty: 10,
            type: "restock",
          },
          { headers: adminHeaders },
        )
        expect(res.status).toBe(200)
        expect(res.data.new_on_hand).toBe(10)
      })

      it("POST /admin/wms/stock with negative qty decrements", async () => {
        const svc = getContainer().resolve("wmsService") as any
        await svc.incrementStock({
          vendor_id: "v_api3",
          variant_id: "var_api3",
          qty: 10,
          type: "restock",
        })
        const res = await api.post(
          "/admin/wms/stock",
          {
            vendor_id: "v_api3",
            variant_id: "var_api3",
            qty: -3,
            type: "sale",
          },
          { headers: adminHeaders },
        )
        expect(res.status).toBe(200)
        expect(res.data.new_on_hand).toBe(7)
      })

      it("GET /admin/wms/reservations?vendor_id returns array", async () => {
        const res = await api.get("/admin/wms/reservations?vendor_id=v_api", {
          headers: adminHeaders,
        })
        expect(res.status).toBe(200)
        expect(Array.isArray(res.data.reservations)).toBe(true)
      })

      it("GET /admin/wms/movements?vendor_id returns audit log", async () => {
        // Make sure there's at least one movement for v_api
        const svc = getContainer().resolve("wmsService") as any
        await svc.incrementStock({
          vendor_id: "v_api",
          variant_id: "var_api_mv",
          qty: 1,
          type: "restock",
        })
        const res = await api.get("/admin/wms/movements?vendor_id=v_api", {
          headers: adminHeaders,
        })
        expect(res.status).toBe(200)
        expect(Array.isArray(res.data.movements)).toBe(true)
        expect(res.data.movements.length).toBeGreaterThan(0)
      })

      it("GET /admin/wms/drift-report returns flagged array", async () => {
        const res = await api.get("/admin/wms/drift-report", {
          headers: adminHeaders,
        })
        expect(res.status).toBe(200)
        expect(Array.isArray(res.data.flagged)).toBe(true)
      })

      it("PUT /admin/wms/locations upserts a shop location", async () => {
        const res = await api.put(
          "/admin/wms/locations",
          {
            vendor_id: "v_loc",
            lat: 33.3152,
            lng: 44.3661,
            delivery_radius_km: 5,
            address_text: "Karrada",
          },
          { headers: adminHeaders },
        )
        expect(res.status).toBe(200)
        expect(res.data.ok).toBe(true)
      })
    })
  },
})
