import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { POS_TAG_MODULE } from "../../../modules/pos_tag"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendor_id = (req.query as any).vendor_id as string | undefined
  if (!vendor_id) {
    return res.status(400).json({ error: "vendor_id query param is required" })
  }
  const svc = req.scope.resolve(POS_TAG_MODULE) as any
  const tags = await svc.listForVendor(vendor_id)
  res.json({ tags })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body as any) || {}
  const { vendor_id, name, featured, position } = body
  if (!vendor_id || !name) {
    return res.status(400).json({ error: "vendor_id and name are required" })
  }
  ;(req as any).audit_context = { vendor_id }
  const svc = req.scope.resolve(POS_TAG_MODULE) as any
  try {
    const tag = await svc.createForVendor(vendor_id, { name, featured, position })
    res.status(201).json({ tag })
  } catch (e: any) {
    res.status(409).json({ error: e.message })
  }
}
