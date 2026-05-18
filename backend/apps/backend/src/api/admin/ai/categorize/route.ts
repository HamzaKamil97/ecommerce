import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_MODULE } from "../../../../modules/ai"
import type AiService from "../../../../modules/ai/service"

// POST /admin/ai/categorize   body: { title, description?, image_urls? }

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const ai = req.scope.resolve(AI_MODULE) as AiService
  const body = (req.body as any) || {}
  if (!body.title) return res.status(400).json({ error: "title is required" })
  const out = await ai.suggestCategorization(body)
  res.json(out)
}
