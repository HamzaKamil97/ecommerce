"use client"
import { useCart } from "@lib/context/cart-context"

export default function CrossShopModalWeb() {
  const { pending_add, shop_name, confirmCrossShopAdd, cancelCrossShopAdd } = useCart()
  if (!pending_add) return null
  return (
    <div className="fixed inset-0 z-[9999] bg-black/45 flex items-center justify-center p-6" onClick={cancelCrossShopAdd}>
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div className="w-14 h-14 rounded-2xl bg-amber-100 grid place-items-center mb-4 mx-auto text-2xl">⚠️</div>
        <h2 className="text-lg font-bold text-center mb-2">Start a new basket?</h2>
        <p className="text-sm text-gray-500 text-center mb-5 leading-relaxed">
          Your basket has items from <span className="text-gray-900 font-bold">{shop_name ?? "the current shop"}</span>.<br/>
          Adding from <span className="text-gray-900 font-bold">{pending_add.shop_name}</span> will clear those items.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={cancelCrossShopAdd} className="py-3 bg-gray-100 rounded-xl font-bold text-sm">Cancel</button>
          <button onClick={confirmCrossShopAdd} className="py-3 bg-teal-700 text-white rounded-xl font-bold text-sm">Clear and add</button>
        </div>
      </div>
    </div>
  )
}
