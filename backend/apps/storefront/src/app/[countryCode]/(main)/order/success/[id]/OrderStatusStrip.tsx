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
  refunded: "Your order has been refunded",
}

// Statuses that won't change again — stop polling once we hit one.
const TERMINAL = new Set(["delivered", "rejected", "cancelled", "refunded"])

export function OrderStatusStrip({ orderId }: { orderId: string }) {
  const [status, setStatus] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setInterval> | undefined
    const poll = async () => {
      try {
        const r = await fetch(`${BASE}/store/online-order-status/${orderId}`, {
          headers: { "x-publishable-api-key": PK }, credentials: "include",
        })
        if (r.ok && alive) {
          const s = (await r.json()).status as string
          setStatus(s)
          if (TERMINAL.has(s) && timer) clearInterval(timer)
        }
      } catch { /* ignore transient */ }
    }
    poll()
    timer = setInterval(poll, 5000)
    return () => { alive = false; if (timer) clearInterval(timer) }
  }, [orderId])

  if (!status) return null
  return (
    <div data-testid="order-status-strip" className="mx-4 mt-4 rounded-xl border border-gray-200 bg-white p-3 text-sm font-medium">
      {LABELS[status] ?? status}
    </div>
  )
}
