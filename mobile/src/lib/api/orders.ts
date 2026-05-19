const BASE = process.env.EXPO_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PK = process.env.EXPO_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export interface PlaceCodArgs {
  shop_slug: string
  address_id?: string
  inline_address?: any
  items: Array<{ variant_id: string; qty: number }>
  shop_notes?: string
  delivery_notes?: string
  coupon_code?: string | null
  currency_code: "iqd" | "usd"
}

export async function placeCodOrder(
  token: string | null,
  args: PlaceCodArgs
): Promise<{ order_id: string; display_id: string }> {
  const headers: Record<string, string> = {
    "x-publishable-api-key": PK,
    "content-type": "application/json",
  }
  if (token) headers.authorization = `Bearer ${token}`

  const r = await fetch(`${BASE}/store/orders/place-cod`, {
    method: "POST",
    headers,
    body: JSON.stringify(args),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error((err as any).error ?? `placeCodOrder: ${r.status}`)
  }
  return await r.json()
}
