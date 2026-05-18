'use client'

import { useEffect, useState } from 'react'
import { vendorApi } from '@/lib/api'
import { useRouter } from 'next/navigation'

export default function NewProduct() {
  const router = useRouter()
  const [me, setMe] = useState<any>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [thumbnail, setThumbnail] = useState('')
  const [priceCents, setPriceCents] = useState('')
  const [verticalFields, setVerticalFields] = useState<Record<string, any>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    vendorApi.me().then(setMe).catch((e) => setError(e.message))
  }, [])

  const submit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await vendorApi.createProduct({
        title,
        description,
        thumbnail,
        prices: priceCents ? [{ amount: Number(priceCents), currency_code: 'usd' }] : [],
        vertical_fields: verticalFields,
      })
      router.push('/products')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!me) return <div className="container"><p className="muted">Loading…</p></div>

  return (
    <div className="container">
      <h1>New product</h1>
      <p className="muted">Vertical: <span className="tag">{me.tenant?.vertical}</span></p>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="grid">
          <div>
            <label className="muted">Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Margherita Pizza" />
          </div>
          <div>
            <label className="muted">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Tomato, mozzarella, fresh basil…"
            />
          </div>
          <div>
            <label className="muted">Thumbnail URL</label>
            <input value={thumbnail} onChange={(e) => setThumbnail(e.target.value)} placeholder="https://…" />
          </div>
          <div>
            <label className="muted">Price (cents, e.g. 1499 = $14.99)</label>
            <input
              type="number"
              value={priceCents}
              onChange={(e) => setPriceCents(e.target.value)}
              placeholder="1499"
            />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>
          {me.vertical_template?.emoji} {me.vertical_template?.label} specifics
        </h3>
        {(me.vertical_template?.fields ?? []).map((f: any) => (
          <div key={f.key} style={{ marginBottom: 12 }}>
            <label className="muted">{f.label}{f.required ? ' *' : ''}</label>
            {f.type === 'boolean' ? (
              <select
                value={String(verticalFields[f.key] ?? '')}
                onChange={(e) =>
                  setVerticalFields({ ...verticalFields, [f.key]: e.target.value === 'true' })
                }
              >
                <option value="">—</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            ) : f.type === 'select' ? (
              <select
                value={verticalFields[f.key] ?? ''}
                onChange={(e) => setVerticalFields({ ...verticalFields, [f.key]: e.target.value })}
              >
                <option value="">—</option>
                {(f.options ?? []).map((o: string) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : f.type === 'multiselect' ? (
              <select
                multiple
                value={verticalFields[f.key] ?? []}
                onChange={(e) =>
                  setVerticalFields({
                    ...verticalFields,
                    [f.key]: Array.from(e.target.selectedOptions).map((o) => o.value),
                  })
                }
                style={{ minHeight: 80 }}
              >
                {(f.options ?? []).map((o: string) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : f.type === 'number' ? (
              <input
                type="number"
                value={verticalFields[f.key] ?? ''}
                onChange={(e) =>
                  setVerticalFields({ ...verticalFields, [f.key]: Number(e.target.value) || null })
                }
              />
            ) : f.type === 'json' || f.type === 'tags' ? (
              <textarea
                rows={3}
                value={verticalFields[f.key] ?? ''}
                onChange={(e) => setVerticalFields({ ...verticalFields, [f.key]: e.target.value })}
                placeholder={f.help ?? ''}
              />
            ) : (
              <input
                value={verticalFields[f.key] ?? ''}
                onChange={(e) => setVerticalFields({ ...verticalFields, [f.key]: e.target.value })}
                placeholder={f.help ?? ''}
              />
            )}
            {f.help && <div className="muted" style={{ fontSize: 12 }}>{f.help}</div>}
          </div>
        ))}
      </div>

      {error && (
        <div className="card" style={{ marginTop: 16, borderColor: '#dc2626' }}>
          <span style={{ color: '#f87171' }}>{error}</span>
        </div>
      )}

      <div className="row" style={{ marginTop: 16 }}>
        <button onClick={submit} disabled={submitting || !title}>
          {submitting ? 'Saving…' : 'Save as draft'}
        </button>
        <button className="secondary" onClick={() => router.push('/products')}>Cancel</button>
      </div>
    </div>
  )
}
