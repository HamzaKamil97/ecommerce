"use client"
import { useCallback, RefObject } from "react"
import { flyToCart } from "@modules/products/components/fly-to-cart/host"
import { useCart, CartItem } from "@lib/context/cart-context"

export function useFlyToCart() {
  const { addItem } = useCart()
  return useCallback((opts: {
    sourceRef: RefObject<HTMLElement | null>
    imageUrl: string | null
    shop: { slug: string; name: string; currency: "iqd" | "usd" }
    item: Omit<CartItem, "qty">
  }) => {
    function doAdd() {
      addItem(opts.shop, opts.item)
    }
    if (!opts.sourceRef.current || !opts.imageUrl) {
      doAdd()
      return
    }
    const rect = opts.sourceRef.current.getBoundingClientRect()
    flyToCart({ imageUrl: opts.imageUrl, sourceRect: rect, onComplete: doAdd })
  }, [addItem])
}
