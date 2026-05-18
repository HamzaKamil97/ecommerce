import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveVendorContext } from "../_helpers"

// GET /vendor/me   → returns the authenticated vendor + their tenant + their available vertical template

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const ctx = await resolveVendorContext(req, res)
  if (!ctx) return

  // Pull the vertical template for the vendor's tenant.
  const verticalFields = req.scope.resolve("vertical_fields") as any
  const template = verticalFields.getTemplate(ctx.tenant.vertical)

  res.json({
    vendor: ctx.vendor,
    tenant: ctx.tenant,
    vertical_template: template,
  })
}
