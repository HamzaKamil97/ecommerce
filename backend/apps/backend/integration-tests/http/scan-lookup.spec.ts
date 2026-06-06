/**
 * Integration tests for GET /pos/scan/lookup
 *
 * Seeding strategy:
 *   medusaIntegrationTestRunner gives each `it()` its own fresh database.
 *   We therefore seed inside each test (or share a helper that each test calls).
 *   Products are created via the admin HTTP API (createProductsWorkflow path)
 *   so barcodes, prices, and metadata land in the correct tables.
 *   Stock is seeded directly via wmsService.incrementStock (same as
 *   pos-online-orders.spec.ts).
 *
 * Admin bootstrap pattern mirrors catalog-snapshot.spec.ts exactly.
 */

import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { createUserAccountWorkflow } from "@medusajs/core-flows"

jest.setTimeout(180_000)

async function bootstrapAdmin(
  api: any,
  container: any,
): Promise<Record<string, string>> {
  const email = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`
  const password = "supersecret1"
  const registerRes = await api
    .post(`/auth/user/emailpass/register`, { email, password })
    .catch((e: any) => e.response)
  if (registerRes.status !== 200 || !registerRes.data?.token) {
    throw new Error(`Admin registration failed (${registerRes.status})`)
  }
  const [, payloadB64] = (registerRes.data.token as string).split(".")
  const payload = JSON.parse(
    Buffer.from(payloadB64, "base64url").toString("utf-8"),
  )
  await createUserAccountWorkflow(container).run({
    input: {
      authIdentityId: payload.auth_identity_id,
      userData: { email, first_name: "Test", last_name: "Admin" },
    },
  })
  const loginRes = await api.post(`/auth/user/emailpass`, { email, password })
  return { Authorization: `Bearer ${loginRes.data.token}` }
}

/** Create a product via the admin API and return the first variant's id. */
async function createProduct(
  api: any,
  headers: Record<string, string>,
  vendor_id: string,
  opts: { title: string; price_minor: number; barcode: string },
): Promise<{ variantId: string }> {
  const r = await api
    .post(
      "/admin/catalog/manager-products",
      {
        vendor_id,
        title: opts.title,
        price_minor: opts.price_minor,
        currency_code: "iqd",
        barcode: opts.barcode,
      },
      { headers },
    )
    .catch((e: any) => e.response)
  if (r.status !== 201) {
    throw new Error(`createProduct failed: ${r.status} ${JSON.stringify(r.data)}`)
  }
  const variantId =
    r.data.product?.variants?.[0]?.id ?? r.data.product?.variant_id
  if (!variantId) throw new Error("createProduct: no variantId in response")
  return { variantId }
}

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    const VENDOR = "v_lk"

    it("barcode in-stock → found=true, sellable=true, qty>0, price is number", async () => {
      const headers = await bootstrapAdmin(api, getContainer())
      const wms: any = getContainer().resolve("wmsService")

      const { variantId } = await createProduct(api, headers, VENDOR, {
        title: "Scan Lookup In-Stock",
        price_minor: 1500,
        barcode: "BC-IN",
      })
      await wms.incrementStock({
        vendor_id: VENDOR,
        variant_id: variantId,
        qty: 5,
        type: "restock",
      })

      const a = await api.get(
        `/pos/scan/lookup?vendor_id=${VENDOR}&barcode=BC-IN`,
      )
      expect(a.status).toBe(200)
      expect(a.data.found).toBe(true)
      expect(a.data.sellable).toBe(true)
      expect(a.data.qty_available).toBeGreaterThan(0)
      expect(typeof a.data.price_minor).toBe("number")
    })

    it("barcode out-of-stock → found=true, sellable=false", async () => {
      const headers = await bootstrapAdmin(api, getContainer())

      await createProduct(api, headers, VENDOR, {
        title: "Scan Lookup OOS",
        price_minor: 2000,
        barcode: "BC-OOS",
      })
      // Intentionally no wms.incrementStock → 0 available

      const b = await api.get(
        `/pos/scan/lookup?vendor_id=${VENDOR}&barcode=BC-OOS`,
      )
      expect(b.status).toBe(200)
      expect(b.data.found).toBe(true)
      expect(b.data.sellable).toBe(false)
    })

    it("unknown barcode → found=false", async () => {
      // No seeding needed; just need the endpoint to exist
      const c = await api.get(
        `/pos/scan/lookup?vendor_id=${VENDOR}&barcode=NOPE`,
      )
      expect(c.status).toBe(200)
      expect(c.data.found).toBe(false)
    })

    it("name search returns matches array with items", async () => {
      const headers = await bootstrapAdmin(api, getContainer())

      await createProduct(api, headers, VENDOR, {
        title: "Scan Lookup Name Search Item",
        price_minor: 1000,
        barcode: "BC-NS",
      })

      const d = await api.get(
        `/pos/scan/lookup?vendor_id=${VENDOR}&q=Scan+Lookup+Name`,
      )
      expect(d.status).toBe(200)
      expect(Array.isArray(d.data.matches)).toBe(true)
      expect(d.data.matches.length).toBeGreaterThan(0)
    })

    it("name search returns empty array for non-matching query", async () => {
      const d = await api.get(
        `/pos/scan/lookup?vendor_id=${VENDOR}&q=ZZZNOMATCH999`,
      )
      expect(d.status).toBe(200)
      expect(Array.isArray(d.data.matches)).toBe(true)
      expect(d.data.matches.length).toBe(0)
    })

    it("missing vendor_id → 400", async () => {
      const e = await api
        .get("/pos/scan/lookup?barcode=BC-IN")
        .catch((x: any) => x.response)
      expect(e.status).toBe(400)
    })

    it("missing barcode and q → 400", async () => {
      const f = await api
        .get(`/pos/scan/lookup?vendor_id=${VENDOR}`)
        .catch((x: any) => x.response)
      expect(f.status).toBe(400)
    })
  },
})
