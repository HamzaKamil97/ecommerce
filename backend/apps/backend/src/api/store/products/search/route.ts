import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

// GET /store/products/search?q=&section=&category=&fast=1
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const productSvc = req.scope.resolve(Modules.PRODUCT) as any
  const q = ((req.query.q as string) ?? "").toLowerCase().trim()
  const section = req.query.section as string | undefined
  const category = req.query.category as string | undefined

  const all = await productSvc.listProducts(
    { status: ["published"] },
    { take: 500, relations: ["categories", "variants"] }
  )

  const filtered = all
    .filter((p: any) => {
      if (
        q &&
        !(
          p.title?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
        )
      )
        return false
      const taxonomyCat = p.categories?.find(
        (c: any) => c?.metadata?.is_taxonomy
      )
      if (section) {
        if (!taxonomyCat) return false
        if (
          !(
            taxonomyCat.handle === section ||
            taxonomyCat.handle.startsWith(`${section}.`)
          )
        )
          return false
      }
      if (category) {
        if (!taxonomyCat) return false
        if (
          !(
            taxonomyCat.handle === category ||
            taxonomyCat.handle.startsWith(`${category}.`)
          )
        )
          return false
      }
      return true
    })
    .slice(0, 50)

  res.json({
    results: filtered.map((p: any) => ({
      id: p.id,
      handle: p.handle,
      title: p.title,
      thumbnail: p.thumbnail,
      description: p.description,
      leaf_handle:
        p.categories?.find((c: any) => c?.metadata?.is_taxonomy)?.handle ??
        null,
    })),
  })
}
