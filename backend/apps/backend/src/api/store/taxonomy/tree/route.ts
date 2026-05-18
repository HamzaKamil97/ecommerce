import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TAXONOMY_TREE } from "../../../../taxonomy/tree"

// GET /store/taxonomy/tree
// Returns the full Section→Category(→Sub-category) tree. Public.
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  res.setHeader("Cache-Control", "public, max-age=300") // 5 minutes
  res.json({ tree: TAXONOMY_TREE })
}
