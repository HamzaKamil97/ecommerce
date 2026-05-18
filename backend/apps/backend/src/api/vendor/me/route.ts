import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveVendorContext } from "../_helpers"

// GET /vendor/me   → returns the authenticated vendor + their tenant

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const ctx = await resolveVendorContext(req, res)
  if (!ctx) return

  res.json({
    vendor: ctx.vendor,
    tenant: ctx.tenant,
  })
}
