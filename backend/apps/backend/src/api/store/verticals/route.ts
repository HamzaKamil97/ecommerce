import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { VERTICAL_FIELDS_MODULE } from "../../../modules/vertical-fields"
import type VerticalFieldsService from "../../../modules/vertical-fields/service"

// GET /store/verticals     public — used by mobile + web to know which fields to render

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(VERTICAL_FIELDS_MODULE) as VerticalFieldsService
  res.json({ templates: svc.listTemplates() })
}
