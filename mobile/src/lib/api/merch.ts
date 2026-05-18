import { MerchCategory } from "./types"

const BASE = process.env.EXPO_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PK = process.env.EXPO_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY ?? ""

interface ShopMerchResponse {
  tenant: { slug: string; name: string }
  merch_categories: MerchCategory[]
}

export async function fetchShopMerchCategories(shopSlug: string): Promise<MerchCategory[]> {
  const res = await fetch(`${BASE}/store/tenants/${shopSlug}/merch-categories`, {
    headers: { "x-publishable-api-key": PK, accept: "application/json" },
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  const data = (await res.json()) as ShopMerchResponse
  return data.merch_categories
}
