import { notFound } from "next/navigation"
import { getShopMerchCategories } from "@lib/data/merch"
import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions } from "@lib/data/cookies"
import MerchTabs from "@modules/shops/components/merch-tabs"
import type { MerchCategory } from "@lib/types/taxonomy"

interface Props {
  params: Promise<{ countryCode: string; handle: string }>
}

export default async function ShopPage(props: Props) {
  const { handle } = await props.params

  // Fetch shop tenant + merch categories
  const shopData = await getShopMerchCategories(handle)
  if (!shopData) notFound()

  const { tenant, merch_categories } = shopData

  // Early return with empty state if no categories defined yet (seed not rewritten)
  if (merch_categories.length === 0) {
    return (
      <div className="px-4 py-6 max-w-screen-xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">{tenant.name}</h1>
        <p className="text-gray-500 mt-8 text-center">No categories set up yet.</p>
      </div>
    )
  }

  // Fetch products via the SDK client (same pattern as lib/data/products.ts)
  const next = await getCacheOptions("products")
  const productsData = await sdk.client
    .fetch<{ products: HttpTypes.StoreProduct[]; count: number }>("/store/products", {
      method: "GET",
      query: {
        limit: 200,
        fields: "id,handle,title,thumbnail,categories.id,categories.handle,categories.metadata",
      },
      next,
      cache: "force-cache",
    })
    .catch(() => ({ products: [] as HttpTypes.StoreProduct[], count: 0 }))

  const list = productsData.products ?? []

  // Build a set of category handles belonging to this shop's merch categories
  const merchHandleSet = new Set(merch_categories.map((m: MerchCategory) => m.handle))

  // Group products by merch_category handle
  const byMerch: Record<string, Array<{ id: string; handle: string; title: string; thumbnail: string | null }>> = {}
  for (const m of merch_categories) byMerch[m.handle] = []

  for (const p of list) {
    for (const c of (p.categories ?? []) as Array<{ id: string; handle: string; metadata?: Record<string, unknown> }>) {
      // Skip taxonomy categories (vertical/sub-vertical markers)
      if (c?.metadata?.is_taxonomy === true) continue
      if (merchHandleSet.has(c.handle) && byMerch[c.handle]) {
        byMerch[c.handle].push({
          id: p.id,
          handle: p.handle ?? "",
          title: p.title ?? "",
          thumbnail: p.thumbnail ?? null,
        })
      }
    }
  }

  return (
    <div className="px-4 py-6 max-w-screen-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">{tenant.name}</h1>
      <MerchTabs categories={merch_categories} productsByMerch={byMerch} />
    </div>
  )
}
