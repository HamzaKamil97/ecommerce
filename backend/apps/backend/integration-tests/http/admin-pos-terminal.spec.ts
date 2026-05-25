import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { createUserAccountWorkflow } from "@medusajs/core-flows"

async function bootstrapAdmin(api: any, container: any) {
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

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let adminHeaders: Record<string, string>
    beforeEach(async () => {
      const { headers } = await bootstrapAdmin(api, getContainer())
      adminHeaders = headers
    })

    describe("Admin pos-terminal routes", () => {
      it("GET /admin/pos-terminal/ping → 200 + pos-terminal-ok", async () => {
        const r = await api.get("/admin/pos-terminal/ping", { headers: adminHeaders })
        expect(r.status).toBe(200)
        expect(r.data).toEqual({ ping: "pos-terminal-ok" })
      })

      it("POST /admin/pos-terminal/sales records a sale", async () => {
        const wms: any = getContainer().resolve("wmsService")
        await wms.incrementStock({ vendor_id: "v_http", variant_id: "var_http", qty: 5, type: "restock" })
        const svc: any = getContainer().resolve("posTerminalService")
        const cashier = await svc.createCashier({ vendor_id: "v_http", name: "H", pin: "1", role: "cashier" })
        const body = {
          client_id: "cli_http_1",
          vendor_id: "v_http",
          cashier_id: cashier.id,
          terminal_id: "t_http",
          lines: [{ variant_id: "var_http", qty: 2, unit_price_minor: 1500, name_snapshot: "Z" }],
          paid_amount_minor: 5000,
          currency_code: "iqd",
          client_created_at: new Date().toISOString(),
        }
        const r = await api.post("/admin/pos-terminal/sales", body, { headers: adminHeaders })
        expect(r.status).toBe(200)
        expect(r.data.sale.total_minor).toBe(3000)
        expect(r.data.sale.change_due_minor).toBe(2000)
      })

      it("POST /admin/pos-terminal/sales returns 400 when required fields missing", async () => {
        const r = await api
          .post("/admin/pos-terminal/sales", { client_id: "cli_x" }, { headers: adminHeaders })
          .catch((e: any) => e.response)
        expect(r.status).toBe(400)
      })

      it("GET /admin/pos-terminal/cashiers returns roster without pin_hash", async () => {
        const svc: any = getContainer().resolve("posTerminalService")
        await svc.createCashier({ vendor_id: "v_roster", name: "Roster", pin: "1", role: "cashier" })
        const r = await api.get("/admin/pos-terminal/cashiers?vendor_id=v_roster", { headers: adminHeaders })
        expect(r.status).toBe(200)
        expect(r.data.cashiers[0].pin_hash).toBeUndefined()
        expect(r.data.cashiers[0].pin_hash_prefix).toMatch(/^[a-f0-9]{8}$/)
      })

      it("POST /admin/pos-terminal/cashiers/verify accepts correct PIN, rejects bad with 401", async () => {
        const svc: any = getContainer().resolve("posTerminalService")
        const c = await svc.createCashier({ vendor_id: "v_v", name: "V", pin: "abcd", role: "cashier" })
        const ok = await api.post("/admin/pos-terminal/cashiers/verify",
          { cashier_id: c.id, pin: "abcd" }, { headers: adminHeaders })
        expect(ok.status).toBe(200)
        expect(ok.data.cashier.name).toBe("V")
        const bad = await api.post("/admin/pos-terminal/cashiers/verify",
          { cashier_id: c.id, pin: "wrong" }, { headers: adminHeaders })
          .catch((e: any) => e.response)
        expect(bad.status).toBe(401)
      })

      it("GET /admin/pos-terminal/catalog-snapshot returns a well-formed envelope", async () => {
        const r = await api.get("/admin/pos-terminal/catalog-snapshot?vendor_id=v_http", { headers: adminHeaders })
        expect(r.status).toBe(200)
        expect(r.data.vendor_id).toBe("v_http")
        expect(Array.isArray(r.data.items)).toBe(true)
        expect(typeof r.data.generated_at).toBe("string")
      })
    })
  },
})
