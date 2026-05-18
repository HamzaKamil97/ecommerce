import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { VERTICAL_FIELDS_MODULE } from "../../../../../modules/vertical-fields"
import type VerticalFieldsService from "../../../../../modules/vertical-fields/service"

// GET /store/products/{id}/vertical-fields
//   Returns the vertical + field values + template for rendering on mobile/web.

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(VERTICAL_FIELDS_MODULE) as VerticalFieldsService
  const row = await svc.getForProduct(req.params.id)
  if (!row) {
    return res.json({ vertical: null, fields: null, template: null })
  }
  const template = svc.getTemplate(row.vertical)
  res.json({
    vertical: row.vertical,
    fields: row.fields,
    template,
  })
}
