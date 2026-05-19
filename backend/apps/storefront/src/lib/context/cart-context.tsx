"use client"
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react"

export interface CartItem {
  product_id: string
  variant_id: string
  product_handle: string
  title: string
  thumbnail: string | null
  unit_price_minor: number
  currency_code: "iqd" | "usd"
  qty: number
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
  pending_add: { shop_slug: string; shop_name: string; shop_currency: "iqd" | "usd"; item: CartItem } | null
}

const EMPTY: CartState = {
  shop_slug: null, shop_name: null, shop_display_currency: "iqd",
  items: [], shop_notes: "", delivery_notes: "",
  coupon_code: null, discount_minor: 0, pending_add: null,
}

interface CartContextValue extends CartState {
  itemCount: number
  subtotalMinor: number
  addItem: (shop: { slug: string; name: string; currency: "iqd" | "usd" }, item: Omit<CartItem, "qty">) => "added" | "needs_confirm"
  confirmCrossShopAdd: () => void
  cancelCrossShopAdd: () => void
  incQty: (variantId: string) => void
  decQty: (variantId: string) => void
  removeItem: (variantId: string) => void
  setShopNotes: (s: string) => void
  setDeliveryNotes: (s: string) => void
  setCoupon: (code: string | null, discount: number) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>(EMPTY)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem("hanoot-cart") : null
      if (raw) {
        const parsed = JSON.parse(raw)
        setState({ ...EMPTY, ...parsed, pending_add: null })
      }
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      const { pending_add, ...persistable } = state
      window.localStorage.setItem("hanoot-cart", JSON.stringify(persistable))
    } catch {}
  }, [state, hydrated])

  const addItem = useCallback<CartContextValue["addItem"]>((shop, item) => {
    if (state.shop_slug && state.shop_slug !== shop.slug && state.items.length > 0) {
      setState((s) => ({ ...s, pending_add: { shop_slug: shop.slug, shop_name: shop.name, shop_currency: shop.currency, item: { ...item, qty: 1 } } }))
      return "needs_confirm"
    }
    setState((s) => {
      const existing = s.items.find((i) => i.variant_id === item.variant_id)
      const items = existing
        ? s.items.map((i) => i.variant_id === item.variant_id ? { ...i, qty: i.qty + 1 } : i)
        : [...s.items, { ...item, qty: 1 }]
      return { ...s, items, shop_slug: shop.slug, shop_name: shop.name, shop_display_currency: shop.currency }
    })
    return "added"
  }, [state.shop_slug, state.items.length])

  const confirmCrossShopAdd = useCallback(() => {
    setState((s) => {
      if (!s.pending_add) return s
      const p = s.pending_add
      return { ...EMPTY, shop_slug: p.shop_slug, shop_name: p.shop_name, shop_display_currency: p.shop_currency, items: [p.item] }
    })
  }, [])

  const cancelCrossShopAdd = useCallback(() => setState((s) => ({ ...s, pending_add: null })), [])

  const incQty = useCallback((variantId: string) => {
    setState((s) => ({ ...s, items: s.items.map((i) => i.variant_id === variantId ? { ...i, qty: i.qty + 1 } : i) }))
  }, [])

  const decQty = useCallback((variantId: string) => {
    setState((s) => {
      const next = s.items.map((i) => i.variant_id === variantId ? { ...i, qty: Math.max(0, i.qty - 1) } : i).filter((i) => i.qty > 0)
      if (next.length === 0) return { ...EMPTY }
      return { ...s, items: next }
    })
  }, [])

  const removeItem = useCallback((variantId: string) => {
    setState((s) => {
      const next = s.items.filter((i) => i.variant_id !== variantId)
      if (next.length === 0) return { ...EMPTY }
      return { ...s, items: next }
    })
  }, [])

  const setShopNotes = useCallback((shop_notes: string) => setState((s) => ({ ...s, shop_notes })), [])
  const setDeliveryNotes = useCallback((delivery_notes: string) => setState((s) => ({ ...s, delivery_notes })), [])
  const setCoupon = useCallback((code: string | null, discount: number) => setState((s) => ({ ...s, coupon_code: code, discount_minor: discount })), [])
  const clear = useCallback(() => setState(EMPTY), [])

  const itemCount = state.items.reduce((n, i) => n + i.qty, 0)
  const subtotalMinor = state.items.reduce((n, i) => n + i.qty * i.unit_price_minor, 0)

  return (
    <CartContext.Provider value={{
      ...state, itemCount, subtotalMinor,
      addItem, confirmCrossShopAdd, cancelCrossShopAdd, incQty, decQty, removeItem,
      setShopNotes, setDeliveryNotes, setCoupon, clear,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}
