import { useCartStore } from "../cartStore"

const SHOP_A = { slug: "shop-a", name: "Shop A", currency: "iqd" as const }
const SHOP_B = { slug: "shop-b", name: "Shop B", currency: "iqd" as const }

function mkItem(variantId: string, price = 1000) {
  return {
    product_id: `prod_${variantId}`, variant_id: variantId, product_handle: `h-${variantId}`,
    title: `T ${variantId}`, thumbnail: null, unit_price_minor: price, currency_code: "iqd" as const,
  }
}

describe("cartStore", () => {
  beforeEach(() => useCartStore.getState().clear())

  it("adds first item — sets shop_slug", () => {
    const result = useCartStore.getState().addItem(SHOP_A, mkItem("v1"))
    expect(result).toBe("added")
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().shop_slug).toBe("shop-a")
  })

  it("adding from a different shop returns needs_confirm + sets pending_add", () => {
    useCartStore.getState().addItem(SHOP_A, mkItem("v1"))
    const r = useCartStore.getState().addItem(SHOP_B, mkItem("v2"))
    expect(r).toBe("needs_confirm")
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().pending_add?.shop_slug).toBe("shop-b")
  })

  it("confirmCrossShopAdd wipes old + adds new", () => {
    useCartStore.getState().addItem(SHOP_A, mkItem("v1"))
    useCartStore.getState().addItem(SHOP_B, mkItem("v2"))
    useCartStore.getState().confirmCrossShopAdd()
    expect(useCartStore.getState().shop_slug).toBe("shop-b")
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().items[0].variant_id).toBe("v2")
  })

  it("cancelCrossShopAdd preserves old cart", () => {
    useCartStore.getState().addItem(SHOP_A, mkItem("v1"))
    useCartStore.getState().addItem(SHOP_B, mkItem("v2"))
    useCartStore.getState().cancelCrossShopAdd()
    expect(useCartStore.getState().shop_slug).toBe("shop-a")
    expect(useCartStore.getState().pending_add).toBeNull()
  })

  it("decQty at qty=1 removes the item", () => {
    useCartStore.getState().addItem(SHOP_A, mkItem("v1"))
    useCartStore.getState().decQty("v1")
    expect(useCartStore.getState().items).toHaveLength(0)
    expect(useCartStore.getState().shop_slug).toBeNull()
  })

  it("itemCount sums qty across items", () => {
    useCartStore.getState().addItem(SHOP_A, mkItem("v1"))
    useCartStore.getState().addItem(SHOP_A, mkItem("v1"))
    useCartStore.getState().addItem(SHOP_A, mkItem("v2"))
    expect(useCartStore.getState().itemCount()).toBe(3)
  })

  it("subtotalMinor = sum(qty × unit_price)", () => {
    useCartStore.getState().addItem(SHOP_A, mkItem("v1", 1500))
    useCartStore.getState().addItem(SHOP_A, mkItem("v1", 1500))
    useCartStore.getState().addItem(SHOP_A, mkItem("v2", 500))
    expect(useCartStore.getState().subtotalMinor()).toBe(3500)
  })
})
