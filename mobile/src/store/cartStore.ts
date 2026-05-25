// TODO(SP-B+): Sync this client store with Medusa's /store/carts endpoints.
// Each add/inc/dec/remove should mirror to a server-side cart scoped to
// the shop's sales_channel_id. Checkout uses /store/carts/:id/complete.
// Until then, this store IS the cart — persisted to AsyncStorage.

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import AsyncStorage from "@react-native-async-storage/async-storage"

export interface CartItem {
  product_id: string
  variant_id: string
  product_handle: string
  title: string
  thumbnail: string | null
  unit_price_minor: number
  currency_code: "iqd" | "usd"
  qty: number
  metadata?: Record<string, unknown>
}

export interface PendingAdd {
  shop_slug: string
  shop_name: string
  shop_currency: "iqd" | "usd"
  item: CartItem
}

export interface CartParticipant {
  id: string
  name: string
  avatarColor: string
  isOwner: boolean
}

const AVATAR_COLORS = ['#b88a3a', '#8a6a2c', '#2f6a55', '#862a3a', '#3a352d', '#6f6859']

function colorForId(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function shortId(): string {
  return Math.random().toString(36).slice(2, 10)
}

interface CartState {
  shop_slug: string | null
  shop_name: string | null
  shop_display_currency: "iqd" | "usd"
  items: CartItem[]
  shop_notes: string
  delivery_notes: string
  coupon_code: string | null
  discount_minor: number
  pending_add: PendingAdd | null
  participants: CartParticipant[]
  cart_share_id: string | null

  // actions
  addItem: (shop: { slug: string; name: string; currency: "iqd" | "usd" }, item: Omit<CartItem, "qty">) => "added" | "needs_confirm"
  confirmCrossShopAdd: () => void
  cancelCrossShopAdd: () => void
  incQty: (variantId: string) => void
  decQty: (variantId: string) => void
  removeItem: (variantId: string) => void
  setShopNotes: (notes: string) => void
  setDeliveryNotes: (notes: string) => void
  setCoupon: (code: string | null, discountMinor: number) => void
  clear: () => void
  ensureSelfParticipant: (name: string) => void
  addParticipant: (name?: string) => CartParticipant
  removeParticipant: (id: string) => void
  getInviteLink: () => string

  // selectors
  itemCount: () => number
  subtotalMinor: () => number
}

export const useCartStore = create<CartState>()(persist((set, get) => ({
  shop_slug: null, shop_name: null, shop_display_currency: "iqd",
  items: [], shop_notes: "", delivery_notes: "",
  coupon_code: null, discount_minor: 0, pending_add: null,
  participants: [], cart_share_id: null,

  addItem: (shop, item) => {
    const state = get()
    const sameShop = state.shop_slug === null || state.shop_slug === shop.slug
    if (!sameShop && state.items.length > 0) {
      set({ pending_add: { shop_slug: shop.slug, shop_name: shop.name, shop_currency: shop.currency, item: { ...item, qty: 1 } } })
      return "needs_confirm"
    }
    const existing = state.items.find((i) => i.variant_id === item.variant_id)
    if (existing) {
      set({
        items: state.items.map((i) => i.variant_id === item.variant_id ? { ...i, qty: i.qty + 1 } : i),
        shop_slug: shop.slug, shop_name: shop.name, shop_display_currency: shop.currency,
      })
    } else {
      set({
        items: [...state.items, { ...item, qty: 1 }],
        shop_slug: shop.slug, shop_name: shop.name, shop_display_currency: shop.currency,
      })
    }
    return "added"
  },

  confirmCrossShopAdd: () => {
    const p = get().pending_add
    if (!p) return
    set({
      shop_slug: p.shop_slug, shop_name: p.shop_name, shop_display_currency: p.shop_currency,
      items: [p.item],
      shop_notes: "", delivery_notes: "", coupon_code: null, discount_minor: 0,
      pending_add: null,
    })
  },

  cancelCrossShopAdd: () => set({ pending_add: null }),

  incQty: (variantId) => set((s) => ({
    items: s.items.map((i) => i.variant_id === variantId ? { ...i, qty: i.qty + 1 } : i),
  })),

  decQty: (variantId) => set((s) => {
    const next = s.items.map((i) => i.variant_id === variantId ? { ...i, qty: Math.max(0, i.qty - 1) } : i).filter((i) => i.qty > 0)
    if (next.length === 0) {
      return { items: [], shop_slug: null, shop_name: null, shop_notes: "", delivery_notes: "", coupon_code: null, discount_minor: 0, participants: [] }
    }
    return { items: next }
  }),

  removeItem: (variantId) => set((s) => {
    const next = s.items.filter((i) => i.variant_id !== variantId)
    if (next.length === 0) {
      return { items: [], shop_slug: null, shop_name: null, shop_notes: "", delivery_notes: "", coupon_code: null, discount_minor: 0, participants: [] }
    }
    return { items: next }
  }),

  setShopNotes: (shop_notes) => set({ shop_notes }),
  setDeliveryNotes: (delivery_notes) => set({ delivery_notes }),
  setCoupon: (code, discount) => set({ coupon_code: code, discount_minor: discount }),
  clear: () => set({
    items: [], shop_slug: null, shop_name: null, shop_notes: "", delivery_notes: "",
    coupon_code: null, discount_minor: 0, pending_add: null, participants: [],
  }),

  ensureSelfParticipant: (name) => {
    const list = get().participants ?? []
    if (list.some((p) => p.id === 'self')) return
    const self: CartParticipant = { id: 'self', name, avatarColor: colorForId('self'), isOwner: true }
    set({ participants: [self, ...list] })
  },

  addParticipant: (name) => {
    const id = shortId()
    const p: CartParticipant = {
      id,
      name: name ?? 'Guest',
      avatarColor: colorForId(id),
      isOwner: false,
    }
    set((s) => ({ participants: [...(s.participants ?? []), p] }))
    return p
  },

  removeParticipant: (id) => {
    if (id === 'self') return
    set((s) => ({ participants: (s.participants ?? []).filter((p) => p.id !== id) }))
  },

  getInviteLink: () => {
    let id = get().cart_share_id
    if (!id) {
      id = shortId()
      set({ cart_share_id: id })
    }
    return `hanoot://cart/share/${id}`
  },

  itemCount: () => get().items.reduce((n, i) => n + i.qty, 0),
  subtotalMinor: () => get().items.reduce((n, i) => n + i.qty * i.unit_price_minor, 0),
}), {
  name: "hanoot-cart",
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (state) => ({
    shop_slug: state.shop_slug,
    shop_name: state.shop_name,
    shop_display_currency: state.shop_display_currency,
    items: state.items,
    shop_notes: state.shop_notes,
    delivery_notes: state.delivery_notes,
    coupon_code: state.coupon_code,
    discount_minor: state.discount_minor,
    participants: state.participants,
    cart_share_id: state.cart_share_id,
  }),
}))
