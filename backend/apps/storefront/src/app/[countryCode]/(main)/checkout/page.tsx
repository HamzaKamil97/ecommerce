"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useCart } from "@lib/context/cart-context"

interface SavedAddress {
  id: string
  label: string | null
  recipient_name: string | null
  phone: string | null
  street: string
  building: string | null
  apartment: string | null
  city: string
  region: string | null
  country_code: string
  delivery_instructions: string | null
  is_default: boolean
}

const BASE = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

function formatMinor(amount: number, currency: "iqd" | "usd"): string {
  if (currency === "iqd") return `${new Intl.NumberFormat("en-IQ").format(amount)} IQD`
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount / 100)
}

export default function CheckoutPage() {
  const { countryCode } = useParams() as { countryCode: string }
  const router = useRouter()
  const cart = useCart()

  const [addresses, setAddresses] = useState<SavedAddress[]>([])
  const [selected, setSelected] = useState<SavedAddress | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Inline form state (used when not logged in OR adding new)
  const [showInlineForm, setShowInlineForm] = useState(false)
  const [inlineForm, setInlineForm] = useState({
    label: "Home", recipient_name: "", phone: "",
    street: "", building: "", apartment: "",
    city: "Baghdad", region: "", country_code: "IQ",
    delivery_instructions: "", is_default: true,
  })

  useEffect(() => {
    fetch(`${BASE}/store/addresses`, {
      headers: { "x-publishable-api-key": PK },
      credentials: "include",
    })
      .then((r) => r.ok ? r.json() : { addresses: [] })
      .then((data) => {
        const list: SavedAddress[] = data.addresses ?? []
        setAddresses(list)
        const dflt = list.find((a) => a.is_default) ?? list[0] ?? null
        setSelected(dflt)
        if (list.length === 0) setShowInlineForm(true)
      })
      .catch(() => {})
  }, [])

  async function place() {
    setError(null)
    if (!cart.shop_slug) return setError("Cart is empty")
    if (!selected && !showInlineForm) return setError("Please add a delivery address")
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        shop_slug: cart.shop_slug,
        items: cart.items.map((i) => ({ variant_id: i.variant_id, qty: i.qty })),
        shop_notes: cart.shop_notes,
        delivery_notes: cart.delivery_notes,
        coupon_code: cart.coupon_code,
        currency_code: cart.shop_display_currency,
      }
      if (selected) body.address_id = selected.id
      else body.inline_address = { ...inlineForm, save: true }

      const r = await fetch(`${BASE}/store/orders/place-cod`, {
        method: "POST",
        credentials: "include",
        headers: { "x-publishable-api-key": PK, "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error ?? `HTTP ${r.status}`)
      }
      const { order_id } = await r.json() as { order_id: string }
      cart.clear()
      router.replace(`/${countryCode}/order/success/${order_id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  const subtotal = cart.subtotalMinor
  const discount = cart.discount_minor
  const deliveryFee = 2500
  const total = Math.max(0, subtotal - discount + deliveryFee)

  return (
    <div className="max-w-2xl mx-auto pb-44">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-gray-100 grid place-items-center text-xl">‹</button>
        <h1 className="font-bold text-lg">Checkout</h1>
      </div>

      <div className="px-4 py-4 space-y-6">
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Deliver to</h2>
          {selected ? (
            <button onClick={() => setPickerOpen(true)} className="w-full text-left border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold">{selected.label ?? "Address"}</p>
                  <p className="text-xs text-gray-500">{selected.recipient_name} · {selected.phone}</p>
                  <p className="text-sm mt-1">{[selected.region, selected.street, selected.building].filter(Boolean).join(", ")}</p>
                </div>
                <span className="text-gray-400 text-xl">›</span>
              </div>
            </button>
          ) : (
            <div className="border border-gray-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-bold">Add delivery address</p>
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Recipient name *" value={inlineForm.recipient_name}
                  onChange={(e) => setInlineForm({ ...inlineForm, recipient_name: e.target.value })}
                  className="border border-gray-200 rounded-lg p-2 text-sm" />
                <input placeholder="Phone *" value={inlineForm.phone}
                  onChange={(e) => setInlineForm({ ...inlineForm, phone: e.target.value })}
                  className="border border-gray-200 rounded-lg p-2 text-sm" />
              </div>
              <input placeholder="City *" value={inlineForm.city}
                onChange={(e) => setInlineForm({ ...inlineForm, city: e.target.value })}
                className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
              <input placeholder="Area / Region" value={inlineForm.region}
                onChange={(e) => setInlineForm({ ...inlineForm, region: e.target.value })}
                className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
              <input placeholder="Street / building *" value={inlineForm.street}
                onChange={(e) => setInlineForm({ ...inlineForm, street: e.target.value })}
                className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input type="checkbox" checked={inlineForm.is_default}
                  onChange={(e) => setInlineForm({ ...inlineForm, is_default: e.target.checked })}
                  className="accent-teal-700" />
                Save for next time
              </label>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Delivery instructions</h2>
          <textarea
            value={cart.delivery_notes}
            onChange={(e) => cart.setDeliveryNotes(e.target.value)}
            placeholder="Blue gate near pharmacy, call when arrived..."
            className="w-full border border-gray-200 rounded-xl p-3 text-sm min-h-[80px]"
          />
        </section>

        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Payment</h2>
          <div className="border border-gray-200 rounded-xl p-3 flex items-center gap-3">
            <span className="text-2xl">💵</span>
            <div className="flex-1">
              <p className="font-bold text-sm">Cash on Delivery</p>
              <p className="text-xs text-gray-500">Pay the rider on delivery</p>
            </div>
            <div className="w-6 h-6 rounded-full bg-teal-700 text-white grid place-items-center text-xs font-bold">✓</div>
          </div>
        </section>

        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Summary</h2>
          <div className="bg-gray-50 rounded-xl p-3.5 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">{cart.items.length} items from {cart.shop_name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatMinor(subtotal, cart.shop_display_currency)}</span></div>
            {discount > 0 && (
              <div className="flex justify-between"><span className="text-emerald-600">Discount</span><span className="text-emerald-600">−{formatMinor(discount, cart.shop_display_currency)}</span></div>
            )}
            <div className="flex justify-between"><span className="text-gray-500">Delivery fee</span><span>{formatMinor(deliveryFee, cart.shop_display_currency)}</span></div>
            <div className="flex justify-between border-t border-gray-200 pt-2 mt-1 font-bold text-base"><span>Total</span><span>{formatMinor(total, cart.shop_display_currency)}</span></div>
          </div>
        </section>

        {error && <p className="text-red-600 text-sm">{error}</p>}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 max-w-2xl mx-auto">
        <button
          onClick={place}
          disabled={submitting || (!selected && !showInlineForm)}
          className="w-full bg-teal-700 text-white py-3.5 rounded-xl font-bold text-base flex justify-between items-center px-4 disabled:opacity-50"
        >
          <span>{submitting ? "Placing..." : "Place order"}</span>
          <span>{formatMinor(total, cart.shop_display_currency)} →</span>
        </button>
      </div>
    </div>
  )
}
