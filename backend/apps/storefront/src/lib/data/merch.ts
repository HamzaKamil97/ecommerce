import "server-only"
import { MerchCategory } from "../types/taxonomy"

const BACKEND = process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

interface ShopMerchResponse {
  tenant: { slug: string; name: string }
  merch_categories: MerchCategory[]
}

/** Returns the full shop payload (tenant + merch_categories), or null on error. */
export async function getShopMerchCategories(shopSlug: string): Promise<{
  tenant: { slug: string; name: string }
  merch_categories: MerchCategory[]
} | null> {
  const r = await fetch(`${BACKEND}/store/tenants/${shopSlug}/merch-categories`, {
    headers: { "x-publishable-api-key": PK },
    next: { revalidate: 60, tags: [`merch-${shopSlug}`] },
  })
  if (!r.ok) return null
  return (await r.json()) as ShopMerchResponse
}

/** Convenience helper — returns only the MerchCategory list, empty array on error. */
export async function getMerchCategoriesList(shopSlug: string): Promise<MerchCategory[]> {
  const result = await getShopMerchCategories(shopSlug)
  return result?.merch_categories ?? []
}

/** Convenience helper — returns only the tenant metadata, null on error. */
export async function getShopByMerchSlug(shopSlug: string): Promise<{ slug: string; name: string } | null> {
  const result = await getShopMerchCategories(shopSlug)
  return result?.tenant ?? null
}
