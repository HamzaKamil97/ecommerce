'use client'

import { useEffect, useState } from 'react'
import { vendorApi } from '@/lib/api'
import Link from 'next/link'

export default function ProductsList() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    vendorApi
      .listProducts()
      .then((r) => setProducts(r.products ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Products</h1>
        <Link href="/products/new"><button>+ New product</button></Link>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : products.length === 0 ? (
        <div className="card">
          <p className="muted">No products yet. Click "+ New product" to add your first item.</p>
        </div>
      ) : (
        <div className="grid" style={{ marginTop: 16 }}>
          {products.map((p) => (
            <div key={p.id} className="card">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <strong>{p.title}</strong>
                  <div className="muted" style={{ fontSize: 13 }}>{p.handle}</div>
                </div>
                <div>
                  <span className="tag">{p.approval?.approval_status ?? 'unknown'}</span>
                </div>
              </div>
              <div className="row" style={{ marginTop: 12, gap: 8 }}>
                {p.approval?.approval_status === 'draft' && (
                  <button
                    onClick={async () => {
                      await vendorApi.submitProduct(p.id)
                      load()
                    }}
                  >
                    Submit for review
                  </button>
                )}
                <button
                  className="secondary"
                  onClick={async () => {
                    if (!confirm('Delete this product?')) return
                    await vendorApi.deleteProduct(p.id)
                    load()
                  }}
                >
                  Delete
                </button>
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
