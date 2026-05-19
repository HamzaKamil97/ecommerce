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
  getOrder: (id: string) => vfetch(`/vendor/orders/${id}`),
  analytics: (days = 30) => vfetch(`/vendor/analytics?days=${days}`),

  // Merch categories
  listMerchCategories: (tenantId: string) =>
    vfetch(`/admin/tenants/${tenantId}/merch-categories`).then((r: any) => r.merch_categories),
  createMerchCategory: (tenantId: string, data: { name: string }) =>
    vfetch(`/admin/tenants/${tenantId}/merch-categories`, {
      method: 'POST',
      body: JSON.stringify(data),
    }).then((r: any) => r.merch_category),

  // Taxonomy assignment
  assignProductTaxonomy: (
    productId: string,
    body: { taxonomy_handle: string; core_fields: Record<string, unknown>; custom_fields?: Record<string, unknown> }
  ) =>
    vfetch(`/admin/products/${productId}/taxonomy`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Merch category assignment
  setProductMerchCategories: (productId: string, merchCategoryIds: string[]) =>
    vfetch(`/admin/products/${productId}/merch-categories`, {
      method: 'PUT',
      body: JSON.stringify({ merch_category_ids: merchCategoryIds }),
    }),
}
