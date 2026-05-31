"use client"
import { useEffect, useState } from "react"
import { getOnlineOrderStatus } from "@lib/data/online-orders"

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
    // Poll via a server action: the customer's auth token lives in an httpOnly
    // cookie the browser can't read, so the authenticated read happens server-side.
    const poll = async () => {
      try {
        const res = await getOnlineOrderStatus(orderId)
        if (res?.status && alive) {
          setStatus(res.status)
          if (TERMINAL.has(res.status) && timer) clearInterval(timer)
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
