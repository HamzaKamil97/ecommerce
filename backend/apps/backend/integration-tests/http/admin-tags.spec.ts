import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  createUserAccountWorkflow,
} from "@medusajs/core-flows"
import { Modules } from "@medusajs/framework/utils"

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

    describe("/admin/tags CRUD", () => {
      it("creates two tags and lists them featured-first", async () => {
        // Create Halal (not featured)
        const r1 = await api
          .post(`/admin/tags`, { vendor_id: "v_tags", name: "Halal" }, { headers: adminHeaders })
          .catch((e: any) => e.response)
        expect(r1.status).toBe(201)
        expect(r1.data.tag).toBeDefined()
        expect(r1.data.tag.name).toBe("Halal")
        expect(r1.data.tag.slug).toBe("halal")
        expect(typeof r1.data.tag.id).toBe("string")
        expect(r1.data.tag.featured).toBe(false)

        // Create UHT (featured)
        const r2 = await api
          .post(
            `/admin/tags`,
            { vendor_id: "v_tags", name: "UHT", featured: true },
            { headers: adminHeaders }
          )
          .catch((e: any) => e.response)
        expect(r2.status).toBe(201)
        expect(r2.data.tag.name).toBe("UHT")
        expect(r2.data.tag.slug).toBe("uht")
        expect(r2.data.tag.featured).toBe(true)

        // GET — should return featured first (UHT before Halal)
        const list = await api.get(`/admin/tags?vendor_id=v_tags`, { headers: adminHeaders })
        expect(list.status).toBe(200)
        expect(list.data.tags).toHaveLength(2)
        expect(list.data.tags[0].name).toBe("UHT")
        expect(list.data.tags[1].name).toBe("Halal")
      })

      it("PATCHes a tag and persists the update", async () => {
        const create = await api
          .post(
            `/admin/tags`,
            { vendor_id: "v_tags_patch", name: "Halal" },
            { headers: adminHeaders }
          )
          .catch((e: any) => e.response)
        const id = create.data.tag.id

        const patch = await api
          .patch(
            `/admin/tags/${id}`,
            { featured: true, name: "Halal Certified" },
            { headers: adminHeaders }
          )
          .catch((e: any) => e.response)
        expect(patch.status).toBe(200)
        expect(patch.data.tag.name).toBe("Halal Certified")
        expect(patch.data.tag.featured).toBe(true)

        // Verify persistence
        const list = await api.get(`/admin/tags?vendor_id=v_tags_patch`, { headers: adminHeaders })
        expect(list.data.tags[0].name).toBe("Halal Certified")
        expect(list.data.tags[0].featured).toBe(true)
      })

      it("DELETEs a tag and confirms it is gone", async () => {
        const create = await api
          .post(
            `/admin/tags`,
            { vendor_id: "v_tags_del", name: "Temp" },
            { headers: adminHeaders }
          )
          .catch((e: any) => e.response)
        const id = create.data.tag.id

        const del = await api
          .delete(`/admin/tags/${id}`, { headers: adminHeaders })
          .catch((e: any) => e.response)
        expect(del.status).toBe(204)

        const list = await api.get(`/admin/tags?vendor_id=v_tags_del`, { headers: adminHeaders })
        expect(list.data.tags).toHaveLength(0)
      })

      it("returns 409 on duplicate name (same slug) for same vendor", async () => {
        await api.post(
          `/admin/tags`,
          { vendor_id: "v_tags_dup", name: "Halal" },
          { headers: adminHeaders }
        )
        const dup = await api
          .post(
            `/admin/tags`,
            { vendor_id: "v_tags_dup", name: "Halal" },
            { headers: adminHeaders }
          )
          .catch((e: any) => e.response)
        expect(dup.status).toBe(409)
      })

      it("returns 400 when vendor_id is missing from GET", async () => {
        const res = await api
          .get(`/admin/tags`, { headers: adminHeaders })
          .catch((e: any) => e.response)
        expect(res.status).toBe(400)
      })

      it("PATCHes featured from true → false (un-feature path)", async () => {
        // Create with featured:true
        const create = await api
          .post(
            `/admin/tags`,
            { vendor_id: "v_tags_unfeature", name: "SpecialOffer", featured: true },
            { headers: adminHeaders }
          )
          .catch((e: any) => e.response)
        expect(create.status).toBe(201)
        expect(create.data.tag.featured).toBe(true)

        const id = create.data.tag.id

        // PATCH featured:false
        const patch = await api
          .patch(
            `/admin/tags/${id}`,
            { featured: false },
            { headers: adminHeaders }
          )
          .catch((e: any) => e.response)
        expect(patch.status).toBe(200)
        expect(patch.data.tag.featured).toBe(false)

        // Confirm persisted in list
        const list = await api.get(`/admin/tags?vendor_id=v_tags_unfeature`, { headers: adminHeaders })
        expect(list.data.tags).toHaveLength(1)
        expect(list.data.tags[0].featured).toBe(false)
      })

      it("returns 400 when required POST body fields are missing", async () => {
        // Missing name
        const noName = await api
          .post(`/admin/tags`, { vendor_id: "v_x" }, { headers: adminHeaders })
          .catch((e: any) => e.response)
        expect(noName.status).toBe(400)
      })

      it("returns 409 when name produces an empty slug (all special chars)", async () => {
        const res = await api
          .post(
            `/admin/tags`,
            { vendor_id: "v_tags_empty_slug", name: "---" },
            { headers: adminHeaders }
          )
          .catch((e: any) => e.response)
        expect(res.status).toBe(409)
      })
    })
  },
})
