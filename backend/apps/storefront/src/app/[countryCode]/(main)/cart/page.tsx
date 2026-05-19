"use client"
import { useCart } from "@lib/context/cart-context"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

function formatMinor(amount: number, currency: "iqd" | "usd"): string {
  if (currency === "iqd") return `${new Intl.NumberFormat("en-IQ").format(amount)} IQD`
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount / 100)
}

export default function CartPage() {
  const { countryCode } = useParams() as { countryCode: string }
  const router = useRouter()
  const cart = useCart()

  if (cart.items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h1 className="text-xl font-semibold mb-4">Your basket is empty</h1>
        <Link href={`/${countryCode}`} className="inline-block px-6 py-3 bg-teal-700 text-white font-semibold rounded-xl">
          Browse shops
        </Link>
      </div>
    )
  }

  const deliveryFee = 2500
  const total = cart.subtotalMinor + deliveryFee

  return (
    <div className="max-w-2xl mx-auto pb-44">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-gray-100 grid place-items-center text-xl">‹</button>
        <div className="flex-1">
          <h1 className="font-bold">Your basket</h1>
          {cart.shop_name && <p className="text-xs text-gray-500">{cart.shop_name}</p>}
        </div>
        {cart.shop_slug && (
          <Link href={`/${countryCode}/shop/${cart.shop_slug}`} className="text-teal-700 font-semibold text-sm">+ Add more</Link>
        )}
      </div>

      <div className="px-4">
        {cart.items.map((item) => (
          <div key={item.variant_id} className="flex gap-3 py-4 border-b border-gray-100">
            <Link href={`/${countryCode}/products/${item.product_handle}`}>
              <div className="w-20 h-20 rounded-lg bg-gray-100" style={{
                backgroundImage: item.thumbnail ? `url(${item.thumbnail})` : undefined,
                backgroundSize: "cover", backgroundPosition: "center",
              }} />
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/${countryCode}/products/${item.product_handle}`}>
                <h3 className="font-semibold text-sm line-clamp-2">{item.title}</h3>
              </Link>
              <p className="text-xs text-gray-500 my-1">{formatMinor(item.unit_price_minor, item.currency_code)}</p>
              <div className="flex items-center justify-between gap-3 mt-2">
                <div className="flex items-center bg-gray-100 rounded-full p-1 gap-1">
                  <button onClick={() => cart.decQty(item.variant_id)} className="w-7 h-7 rounded-full bg-white border border-gray-200 text-base font-bold text-gray-500">−</button>
                  <span className="min-w-[24px] text-center font-bold text-sm">{item.qty}</span>
                  <button onClick={() => cart.incQty(item.variant_id)} className="w-7 h-7 rounded-full bg-teal-700 text-white text-base font-bold">+</button>
                </div>
                <span className="font-bold text-sm">{formatMinor(item.qty * item.unit_price_minor, item.currency_code)}</span>
                <button onClick={() => cart.removeItem(item.variant_id)} className="text-gray-400">🗑</button>
              </div>
            </div>
          </div>
        ))}

        <div className="mt-6">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Notes for the shop (optional)</label>
          <textarea
            value={cart.shop_notes}
            onChange={(e) => cart.setShopNotes(e.target.value)}
            placeholder="No onions, cut in 8 slices, allergies, etc."
            className="w-full border border-gray-200 rounded-xl p-3 text-sm min-h-[80px]"
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 max-w-2xl mx-auto">
        <div className="flex justify-between py-1 text-sm"><span className="text-gray-500">Subtotal</span><span>{formatMinor(cart.subtotalMinor, cart.shop_display_currency)}</span></div>
        <div className="flex justify-between py-1 text-sm"><span className="text-gray-500">Delivery fee</span><span>{formatMinor(deliveryFee, cart.shop_display_currency)}</span></div>
        <div className="flex justify-between py-2 mt-2 pt-3 border-t border-gray-200 text-lg font-bold"><span>Total</span><span>{formatMinor(total, cart.shop_display_currency)}</span></div>
        <Link
          href={`/${countryCode}/checkout`}
          className="mt-3 w-full bg-teal-700 text-white py-3.5 rounded-xl font-bold text-base flex justify-between items-center px-4"
        >
          <span>Checkout</span>
          <span>{formatMinor(total, cart.shop_display_currency)} →</span>
        </Link>
      </div>
    </div>
  )
}
