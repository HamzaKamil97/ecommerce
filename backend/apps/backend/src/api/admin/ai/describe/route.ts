import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_MODULE } from "../../../../modules/ai"
import type AiService from "../../../../modules/ai/service"

// POST /admin/ai/describe   body: { title, bullets?, tenant_voice?, target_words? }

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const ai = req.scope.resolve(AI_MODULE) as AiService
  const body = (req.body as any) || {}
  if (!body.title) return res.status(400).json({ error: "title is required" })
  try {
    const out = await ai.generateDescription(body)
    res.json(out)
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "ai failure" })
  }
}
