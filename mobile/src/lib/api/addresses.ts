const BASE = process.env.EXPO_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PK = process.env.EXPO_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

function authHeaders(token: string | null) {
  const h: Record<string, string> = {
    "x-publishable-api-key": PK,
    "content-type": "application/json",
  }
  if (token) h.authorization = `Bearer ${token}`
  return h
}

export interface SavedAddress {
  id: string
  label: string | null
  recipient_name: string | null
  phone: string | null
  street: string
  building: string | null
  apartment: string | null
  city: string
  region: string | null
  postcode: string | null
  country_code: string
  delivery_instructions: string | null
  is_default: boolean
}

export async function listAddresses(token: string | null): Promise<SavedAddress[]> {
  const r = await fetch(`${BASE}/store/addresses`, { headers: authHeaders(token) })
  if (!r.ok) {
    if (r.status === 401) return [] // not logged in → no addresses
    throw new Error(`listAddresses: ${r.status}`)
  }
  const data = await r.json()
  return data.addresses ?? []
}

export interface CreateAddressInput {
  label?: string | null
  recipient_name?: string | null
  phone?: string | null
  street: string
  building?: string | null
  apartment?: string | null
  city: string
  region?: string | null
  country_code: string
  delivery_instructions?: string | null
  is_default?: boolean
}

export async function createAddress(
  token: string | null,
  data: CreateAddressInput
): Promise<SavedAddress> {
  const r = await fetch(`${BASE}/store/addresses`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error((err as any).error ?? `createAddress: ${r.status}`)
  }
  return (await r.json()).address
}

export async function setDefault(
  token: string | null,
  id: string
): Promise<SavedAddress> {
  const r = await fetch(`${BASE}/store/addresses/${id}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ set_default: true }),
  })
  if (!r.ok) throw new Error(`setDefault: ${r.status}`)
  return (await r.json()).address
}
