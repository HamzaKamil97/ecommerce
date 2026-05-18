import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PAYMENTS_MODULE } from "../../../../modules/payments"
import type PaymentsService from "../../../../modules/payments/service"

// GET /store/payments/providers?currency=IQD     → list available payment methods filtered by currency

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(PAYMENTS_MODULE) as PaymentsService
  const currency = req.query.currency ? String(req.query.currency) : undefined
  res.json({ providers: svc.listProviders(currency) })
}
