"use server"

import { getAuthHeaders } from "./cookies"

// Server-side backend URL (same default as the SDK config). Client components
// cannot read the httpOnly `_medusa_jwt` cookie, so the authenticated read of
// the customer's online-order fulfilment status must happen in a server action.
const BASE =
  process.env.MEDUSA_BACKEND_URL ??
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ??
  "http://localhost:9000"
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export interface OnlineOrderStatus {
  status: string
  display_id?: string | null
  accepted_at?: string | null
  delivered_at?: string | null
  rejected_at?: string | null
}

// Returns the linked online_order's fulfilment status for the logged-in customer,
// or null if not authenticated / not found / not theirs.
export async function getOnlineOrderStatus(
  medusaOrderId: string
): Promise<OnlineOrderStatus | null> {
  const auth = await getAuthHeaders()
  if (!("authorization" in auth)) return null
  try {
    const r = await fetch(`${BASE}/store/online-order-status/${medusaOrderId}`, {
      headers: { "x-publishable-api-key": PK, ...auth },
      cache: "no-store",
    })
    if (!r.ok) return null
    return (await r.json()) as OnlineOrderStatus
  } catch {
    return null
  }
}
