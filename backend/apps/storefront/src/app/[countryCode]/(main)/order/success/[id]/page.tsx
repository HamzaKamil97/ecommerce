"use client"
import Link from "next/link"
import { useParams } from "next/navigation"

export default function OrderSuccessPage() {
  const { countryCode, id } = useParams() as { countryCode: string; id: string }
  const displayId = (id?.slice(-6) ?? "------").toUpperCase()

  return (
    <div className="max-w-2xl mx-auto py-12 px-6 text-center min-h-[80vh] flex flex-col">
      <div
        className="w-28 h-28 rounded-full bg-emerald-50 border-4 border-teal-700 grid place-items-center mx-auto mb-6 text-6xl text-teal-700"
        style={{ animation: "popIn 600ms cubic-bezier(.34,1.56,.64,1)" }}
      >
        ✓
      </div>
      <h1 className="text-3xl font-bold mb-3">Order placed</h1>
      <p className="text-sm text-gray-500 mb-6">
        Order <span className="bg-gray-100 px-2 py-0.5 rounded font-mono font-bold text-gray-900">#{displayId}</span>
      </p>
      <p className="text-xs text-gray-500 mb-8">We&apos;ll text you when the order updates.</p>
      <div className="flex-1" />
      <div className="flex flex-col gap-2">
        <Link href={`/${countryCode}/orders`} className="bg-teal-700 text-white py-3.5 rounded-xl font-bold">📍 Track order</Link>
        <Link href={`/${countryCode}`} className="py-3 text-teal-700 font-semibold">← Back to home</Link>
      </div>
      <style>{`
        @keyframes popIn {
          0% { transform: scale(0.3); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
