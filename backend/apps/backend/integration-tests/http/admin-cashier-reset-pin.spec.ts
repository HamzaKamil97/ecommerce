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

    describe("POST /admin/pos-terminal/cashiers/:id/reset-pin", () => {
      it("resets a cashier PIN; new PIN verifies, old PIN fails", async () => {
        const pos: any = getContainer().resolve("posTerminalService")
        const cashier = await pos.createCashier({ vendor_id: "v_rp", name: "Rita", pin: "1111", role: "cashier" })

        const r = await api
          .post(`/admin/pos-terminal/cashiers/${cashier.id}/reset-pin`, { pin: "8264" }, { headers: adminHeaders })
          .catch((e: any) => e.response)

        expect(r.status).toBe(200)
        expect(r.data.ok).toBe(true)

        // new pin verifies
        const ok = await pos.verifyCashierPin(cashier.id, "8264")
        expect(ok.id).toBe(cashier.id)

        // old pin rejected — verifyCashierPin throws PosTerminalBadPinError on wrong pin
        await expect(pos.verifyCashierPin(cashier.id, "1111")).rejects.toBeTruthy()
      })

      it("400 on non-4-digit pin", async () => {
        const pos: any = getContainer().resolve("posTerminalService")
        const c = await pos.createCashier({ vendor_id: "v_rp2", name: "X", pin: "2222", role: "cashier" })

        const r = await api
          .post(`/admin/pos-terminal/cashiers/${c.id}/reset-pin`, { pin: "12" }, { headers: adminHeaders })
          .catch((e: any) => e.response)

        expect(r.status).toBe(400)
      })
    })
  },
})
