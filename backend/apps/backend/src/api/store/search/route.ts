import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_MODULE } from "../../../modules/ai"
import type AiService from "../../../modules/ai/service"

// GET /store/search?q=...&limit=20    semantic-search storefront endpoint.
// Falls back to keyword search if no embeddings indexed yet.

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const q = String(req.query.q ?? "").trim()
  const limit = Math.min(50, Number(req.query.limit ?? 20))
  if (!q) return res.json({ results: [] })

  const ai = req.scope.resolve(AI_MODULE) as AiService
  let hits = await ai.semanticSearch(q, limit)

  // Hydrate product summaries (id + title + thumbnail).
  if (hits.length > 0) {
    try {
      const productModule = req.scope.resolve("product")
      const products = await productModule.listProducts(
        { id: hits.map((h) => h.product_id) },
        { take: limit }
      )
      const byId = new Map(products.map((p: any) => [p.id, p]))
      const enriched = hits
        .map((h) => {
          const p = byId.get(h.product_id) as any
          if (!p) return null
          return {
            id: p.id,
            title: p.title,
            handle: p.handle,
            thumbnail: p.thumbnail,
            score: h.score,
          }
        })
        .filter(Boolean)
      return res.json({ results: enriched, count: enriched.length, method: "semantic" })
    } catch {}
  }

  // Fallback: keyword search via core Store API.
  try {
    const productModule = req.scope.resolve("product")
    const products = await productModule.listProducts({ q }, { take: limit })
    res.json({
      results: products.map((p: any) => ({
        id: p.id,
        title: p.title,
        handle: p.handle,
        thumbnail: p.thumbnail,
        score: 0,
      })),
      count: products.length,
      method: "keyword",
    })
  } catch (e: any) {
    res.json({ results: [], error: e?.message })
  }
}
