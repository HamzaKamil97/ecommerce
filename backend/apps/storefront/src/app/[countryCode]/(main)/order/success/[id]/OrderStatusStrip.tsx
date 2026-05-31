"use client"
import { useEffect, useState } from "react"

const BASE = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

const LABELS: Record<string, string> = {
  pending: "Waiting for the shop to accept…",
  accepted: "Accepted — the shop is preparing your order",
  picking: "Being prepared",
  delivered: "Delivered",
  rejected: "Order declined by the shop",
  cancelled: "Cancelled",
}

export function OrderStatusStrip({ orderId }: { orderId: string }) {
  const [status, setStatus] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    const poll = async () => {
      try {
        const r = await fetch(`${BASE}/store/online-order-status/${orderId}`, {
          headers: { "x-publishable-api-key": PK }, credentials: "include",
        })
        if (r.ok && alive) setStatus((await r.json()).status)
      } catch { /* ignore transient */ }
    }
    poll()
    const t = setInterval(poll, 5000)
    return () => { alive = false; clearInterval(t) }
  }, [orderId])

  if (!status) return null
  return (
    <div data-testid="order-status-strip" className="mx-4 mt-4 rounded-xl border border-gray-200 bg-white p-3 text-sm font-medium">
      {LABELS[status] ?? status}
    </div>
  )
}
