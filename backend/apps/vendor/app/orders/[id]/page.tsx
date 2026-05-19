'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { vendorApi } from '@/lib/api'
import Link from 'next/link'

const C = {
  bg: '#0B0B0F',
  surface: '#15151B',
  border: '#27272A',
  text: '#F7F7F8',
  textMuted: '#9CA3AF',
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    vendorApi
      .getOrder(id)
      .then((r) => setOrder(r.order ?? null))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="container"><p className="muted">Loading…</p></div>
  if (error) return <div className="container"><p style={{ color: '#FCA5A5' }}>{error}</p></div>
  if (!order) return <div className="container"><p className="muted">Order not found.</p></div>

  const total = ((order.total ?? 0) / 100).toFixed(2)
  const subtotal = ((order.subtotal ?? 0) / 100).toFixed(2)
  const shipping = ((order.shipping_total ?? 0) / 100).toFixed(2)
  const addr = order.shipping_address

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
            Order #{order.display_id ?? order.id}
          </h1>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            {new Date(order.created_at).toLocaleString()}
          </div>
        </div>
        <span className="tag">{order.status}</span>
      </div>

      {/* ── Shop notes (kitchen-facing) ── */}
      {order?.metadata?.shop_notes && (
        <section
          style={{
            background: '#2D1F00',
            border: '1px solid #78350F',
            borderRadius: 8,
            padding: 12,
            marginBottom: 0,
          }}
        >
          <strong style={{ color: '#FDE68A' }}>📝 Notes for the shop</strong>
          <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', color: '#FDE68A', fontSize: 14 }}>
            {order.metadata.shop_notes}
          </p>
        </section>
      )}

      {/* ── Delivery instructions (rider-facing) ── */}
      {order?.metadata?.delivery_notes && (
        <section
          style={{
            background: '#052E1A',
            border: '1px solid #065F46',
            borderRadius: 8,
            padding: 12,
            marginBottom: 0,
          }}
        >
          <strong style={{ color: '#6EE7B7' }}>🛵 Delivery instructions</strong>
          <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', color: '#6EE7B7', fontSize: 14 }}>
            {order.metadata.delivery_notes}
          </p>
        </section>
      )}

      {/* Items */}
      <div className="card">
        <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600 }}>Items</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(order.items ?? []).map((item: any, i: number) => (
            <div key={i} className="row" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14 }}>
                <span style={{ color: C.textMuted }}>{item.quantity} ×</span>{' '}
                {item.title ?? item.product_title}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                ${((item.unit_price ?? 0) * item.quantity / 100).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="card">
        <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600 }}>Totals</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted">Subtotal</span>
            <span>${subtotal}</span>
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted">Shipping</span>
            <span>${shipping}</span>
          </div>
          {order?.metadata?.coupon_code && (
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span style={{ color: '#2DD4BF', fontSize: 13, fontWeight: 600 }}>
                🎟️ Coupon: {order.metadata.coupon_code}
              </span>
            </div>
          )}
          <div className="row" style={{ justifyContent: 'space-between', fontWeight: 700, fontSize: 16, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
            <span>Total</span>
            <span>${total}</span>
          </div>
        </div>
      </div>

      {/* Customer / delivery address */}
      {(order.customer || addr) && (
        <div className="card">
          <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600 }}>Customer</h2>
          {order.customer && (
            <p style={{ margin: '0 0 6px', fontSize: 14 }}>
              {order.customer.first_name} {order.customer.last_name}
              {order.customer.email && (
                <span className="muted"> — {order.customer.email}</span>
              )}
            </p>
          )}
          {addr && (
            <p style={{ margin: 0, fontSize: 13, color: C.textMuted }}>
              {[addr.address_1, addr.address_2, addr.city, addr.country_code?.toUpperCase()]
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
        </div>
      )}

      <p style={{ marginTop: 8 }}>
        <Link href="/orders">← Back to orders</Link>
      </p>
    </div>
  )
}
