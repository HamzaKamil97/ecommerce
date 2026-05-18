'use client'

import { useEffect, useState } from 'react'
import { vendorApi } from '@/lib/api'
import Link from 'next/link'

export default function Dashboard() {
  const [me, setMe] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    vendorApi.me().then(setMe).catch((e) => setError(e.message))
    vendorApi.analytics().then(setAnalytics).catch(() => {})
  }, [])

  if (error) {
    return (
      <div className="container">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Sign-in problem</h2>
          <p className="muted">{error}</p>
          <Link href="/"><button>Back to login</button></Link>
        </div>
      </div>
    )
  }

  if (!me) {
    return <div className="container"><p className="muted">Loading…</p></div>
  }

  return (
    <div className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0 }}>{me.tenant?.name ?? 'My shop'}</h1>
          <p className="muted" style={{ margin: 0 }}>
            <span className="tag" style={{ marginRight: 8 }}>{me.tenant?.vertical}</span>
            <span className="tag">{me.tenant?.approval_status}</span>
          </p>
        </div>
        <div className="row">
          <Link href="/products"><button className="secondary">Products</button></Link>
          <Link href="/orders"><button className="secondary">Orders</button></Link>
          <button
            className="secondary"
            onClick={() => {
              document.cookie = 'vendor_user_id=; max-age=0; path=/'
              window.location.href = '/'
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="card">
          <div className="muted">Orders ({analytics?.days ?? 30}d)</div>
          <div style={{ fontSize: 32, fontWeight: 700, marginTop: 8 }}>
            {analytics?.metrics?.total_orders ?? 0}
          </div>
        </div>
        <div className="card">
          <div className="muted">Revenue ({analytics?.days ?? 30}d)</div>
          <div style={{ fontSize: 32, fontWeight: 700, marginTop: 8 }}>
            ${((analytics?.metrics?.total_revenue_cents ?? 0) / 100).toFixed(2)}
          </div>
        </div>
        <div className="card">
          <div className="muted">Avg order value</div>
          <div style={{ fontSize: 32, fontWeight: 700, marginTop: 8 }}>
            ${((analytics?.metrics?.average_order_value_cents ?? 0) / 100).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ marginTop: 0 }}>Your vertical template</h3>
        <p className="muted">These are the custom fields available when you create products in your vertical ({me.tenant?.vertical}).</p>
        <ul>
          {(me.vertical_template?.fields ?? []).map((f: any) => (
            <li key={f.key}>
              <strong>{f.label}</strong> <span className="muted">({f.type}{f.required ? ', required' : ''})</span>
              {f.help && <div className="muted" style={{ fontSize: 13 }}>{f.help}</div>}
            </li>
          ))}
          {(me.vertical_template?.fields?.length ?? 0) === 0 && (
            <li className="muted">No vertical-specific fields configured.</li>
          )}
        </ul>
      </div>
    </div>
  )
}
