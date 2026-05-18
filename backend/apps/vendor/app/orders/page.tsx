'use client'

import { useEffect, useState } from 'react'
import { vendorApi } from '@/lib/api'
import Link from 'next/link'

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    vendorApi
      .listOrders()
      .then((r) => setOrders(r.orders ?? []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="container">
      <h1>Orders</h1>
      {loading ? (
        <p className="muted">Loading…</p>
      ) : orders.length === 0 ? (
        <div className="card">
          <p className="muted">No orders yet. Once customers buy your products, they'll show up here.</p>
        </div>
      ) : (
        <div className="grid">
          {orders.map((o) => (
            <div key={o.id} className="card">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <strong>Order #{o.display_id ?? o.id}</strong>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {new Date(o.created_at).toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="tag">{o.status}</span>
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                {(o.items ?? []).map((item: any, i: number) => (
                  <div key={i} className="muted" style={{ fontSize: 14 }}>
                    {item.quantity} × {item.title ?? item.product_title}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 8, fontWeight: 700 }}>
                ${((o.total ?? 0) / 100).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      )}
      <p style={{ marginTop: 32 }}>
        <Link href="/dashboard">← Back to dashboard</Link>
      </p>
    </div>
  )
}
