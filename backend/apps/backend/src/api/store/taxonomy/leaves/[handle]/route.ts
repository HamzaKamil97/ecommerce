import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getSchemaByHandle } from "../../../../../taxonomy/registry"

// GET /store/taxonomy/leaves/:handle
// Returns the schema for a single leaf. 404 if not a leaf.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const handle = req.params.handle
  const schema = getSchemaByHandle(handle)
  if (!schema) {
    return res.status(404).json({ error: `No schema for handle "${handle}"` })
  }
  res.setHeader("Cache-Control", "public, max-age=300")
  res.json({ schema })
}
