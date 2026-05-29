import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  createUserAccountWorkflow,
} from "@medusajs/core-flows"
import { Modules } from "@medusajs/framework/utils"
import { TENANT_MODULE } from "../../src/modules/tenant"

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

    describe("/admin/tenants/:tenantId/merch-categories", () => {
      it("creates and lists merch categories", async () => {
        const tenantSvc = getContainer().resolve(TENANT_MODULE) as any
        const [t] = await tenantSvc.createTenants([{
          slug: `am-${Date.now()}`,
          name: "AM Shop",
          approval_status: "approved",
        }])

        const create = await api
          .post(
            `/admin/tenants/${t.id}/merch-categories`,
            { name: "Pizzas" },
            { headers: adminHeaders }
          )
          .catch((e: any) => e.response)
        expect(create.status).toBe(201)
        expect(create.data.merch_category.handle).toBe("pizzas")

        const list = await api.get(
          `/admin/tenants/${t.id}/merch-categories`,
          { headers: adminHeaders }
        )
        expect(list.status).toBe(200)
        expect(list.data.merch_categories).toHaveLength(1)
        expect(list.data.merch_categories[0].name).toBe("Pizzas")
      })

      it("renames a merch category via PATCH and persists it", async () => {
        const tenantSvc = getContainer().resolve(TENANT_MODULE) as any
        const [t] = await tenantSvc.createTenants([{
          slug: `am-patch-${Date.now()}`,
          name: "Patch Shop",
          approval_status: "approved",
        }])

        const create = await api.post(
          `/admin/tenants/${t.id}/merch-categories`,
          { name: "Drinks" },
          { headers: adminHeaders }
        )
        const id = create.data.merch_category.id

        // Regression: the PATCH handler must use the MedusaService object form
        // updateMerchCategories({ id, ...fields }). Passing the id positionally
        // makes Medusa resolve id="" → 404 "MerchCategory with id '' not found".
        const patch = await api
          .patch(
            `/admin/tenants/${t.id}/merch-categories/${id}`,
            { name: "Cold Drinks" },
            { headers: adminHeaders }
          )
          .catch((e: any) => e.response)
        expect(patch.status).toBe(200)
        expect(patch.data.merch_category.name).toBe("Cold Drinks")

        const list = await api.get(
          `/admin/tenants/${t.id}/merch-categories`,
          { headers: adminHeaders }
        )
        expect(list.data.merch_categories[0].name).toBe("Cold Drinks")
      })

      it("deletes a merch category via DELETE", async () => {
        const tenantSvc = getContainer().resolve(TENANT_MODULE) as any
        const [t] = await tenantSvc.createTenants([{
          slug: `am-del-${Date.now()}`,
          name: "Del Shop",
          approval_status: "approved",
        }])
        const create = await api.post(
          `/admin/tenants/${t.id}/merch-categories`,
          { name: "Temp" },
          { headers: adminHeaders }
        )
        const id = create.data.merch_category.id

        const del = await api
          .delete(`/admin/tenants/${t.id}/merch-categories/${id}`, { headers: adminHeaders })
          .catch((e: any) => e.response)
        expect(del.status).toBe(204)

        const list = await api.get(
          `/admin/tenants/${t.id}/merch-categories`,
          { headers: adminHeaders }
        )
        expect(list.data.merch_categories).toHaveLength(0)
      })

      it("returns 409 on duplicate handle", async () => {
        const tenantSvc = getContainer().resolve(TENANT_MODULE) as any
        const [t] = await tenantSvc.createTenants([{
          slug: `am-dup-${Date.now()}`,
          name: "Dup Shop",
          approval_status: "approved",
        }])

        await api.post(
          `/admin/tenants/${t.id}/merch-categories`,
          { name: "Sides" },
          { headers: adminHeaders }
        )
        const dup = await api
          .post(
            `/admin/tenants/${t.id}/merch-categories`,
            { name: "Sides" },
            { headers: adminHeaders }
          )
          .catch((e: any) => e.response)
        expect(dup.status).toBe(409)
      })
    })
  },
})
