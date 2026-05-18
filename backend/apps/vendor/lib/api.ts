// Lightweight client for the Medusa vendor API.
// All requests carry x-vendor-user-id from the auth cookie.

const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? process.env.MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

function getUserIdFromCookie(): string | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(/(?:^|;\s*)vendor_user_id=([^;]+)/)
  return m ? decodeURIComponent(m[1]) : null
}

async function vfetch(path: string, init: RequestInit = {}) {
  const userId = getUserIdFromCookie()
  if (!userId) throw new Error('Not signed in')
  const res = await fetch(`${BACKEND}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-vendor-user-id': userId,
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`)
  return res.json()
}

export const vendorApi = {
  me: () => vfetch('/vendor/me'),
  listProducts: () => vfetch('/vendor/products'),
  getProduct: (id: string) => vfetch(`/vendor/products/${id}`),
  createProduct: (body: any) => vfetch('/vendor/products', { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (id: string, body: any) => vfetch(`/vendor/products/${id}`, { method: 'POST', body: JSON.stringify(body) }),
  deleteProduct: (id: string) => vfetch(`/vendor/products/${id}`, { method: 'DELETE' }),
  submitProduct: (id: string) => vfetch(`/vendor/products/${id}/submit`, { method: 'POST' }),
  listOrders: () => vfetch('/vendor/orders'),
  analytics: (days = 30) => vfetch(`/vendor/analytics?days=${days}`),
}
