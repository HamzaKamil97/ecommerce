import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PAYMENTS_MODULE } from "../../../../../modules/payments"
import type PaymentsService from "../../../../../modules/payments/service"

// POST /store/payments/callback/{provider}
// Body shape depends on provider — ZainCash sends JWT, QiCard sends body+signature, etc.

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(PAYMENTS_MODULE) as PaymentsService
  const body = (req.body as any) || {}
  const providerRef = body.provider_ref ?? String(req.query.provider_ref ?? "")
  if (!providerRef) return res.status(400).json({ error: "provider_ref required" })

  try {
    const out = await svc.verifyAndComplete(req.params.provider, {
      jwt: body.jwt ?? body.token ?? String(req.query.token ?? ""),
      signature: body.signature ?? (req.headers["x-signature"] as string),
      provider_ref: providerRef,
      raw_body: body.raw ?? body,
    })
    res.json(out)
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "verify failed" })
  }
}

// GET also supported — most providers redirect back via GET with query params
export const GET = POST
