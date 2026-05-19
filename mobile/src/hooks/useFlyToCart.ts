import { useCallback, RefObject } from "react"
import { findNodeHandle, UIManager, View } from "react-native"
import { flyToCart } from "../components/cart/FlyToCartHost"
import { useCartStore, CartItem } from "../store/cartStore"

interface AddArgs {
  sourceRef: RefObject<View | null>
  shop: { slug: string; name: string; currency: "iqd" | "usd" }
  item: Omit<CartItem, "qty">
  onCrossShopNeeded?: () => void
}

export function useFlyToCart() {
  const addItem = useCartStore((s) => s.addItem)

  return useCallback((opts: AddArgs) => {
    const handle = opts.sourceRef.current ? findNodeHandle(opts.sourceRef.current) : null

    function doAdd() {
      const result = addItem(opts.shop, opts.item)
      if (result === "needs_confirm" && opts.onCrossShopNeeded) opts.onCrossShopNeeded()
    }

    if (!handle || !opts.item.thumbnail) {
      // No measurable source OR no thumbnail — skip animation, just add
      doAdd()
      return
    }
    UIManager.measure(handle, (_x, _y, w, h, pageX, pageY) => {
      flyToCart({
        imageUri: opts.item.thumbnail!,
        sourceX: pageX,
        sourceY: pageY,
        sourceSize: Math.min(w, h),
        onComplete: doAdd,
      })
    })
  }, [addItem])
}
