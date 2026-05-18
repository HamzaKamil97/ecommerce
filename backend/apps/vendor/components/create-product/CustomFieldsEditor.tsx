"use client"
import { useState } from "react"

interface Props {
  value: Record<string, unknown>
  reservedKeys: string[]
  onChange: (next: Record<string, unknown>) => void
}

export default function CustomFieldsEditor({ value, reservedKeys, onChange }: Props) {
  const entries = Object.entries(value ?? {})
  const [draftKey, setDraftKey] = useState("")
  const [draftVal, setDraftVal] = useState("")
  const reserved = new Set(reservedKeys)

  function add() {
    const k = draftKey.trim()
    if (!k) return
    if (reserved.has(k)) { alert(`"${k}" is a core field — pick a different key`); return }
    if (k in value) { alert(`"${k}" already exists`); return }
    onChange({ ...value, [k]: draftVal })
    setDraftKey(""); setDraftVal("")
  }
  function remove(k: string) {
    const next = { ...value }; delete next[k]; onChange(next)
  }

  return (
    <div className="bg-gray-50 rounded-lg p-3.5 mt-4">
      <h3 className="text-sm font-semibold mb-1">Custom fields (optional)</h3>
      <p className="text-xs text-gray-500 mb-3">No validation. Renders below standard specs on the product page.</p>
      <div className="grid grid-cols-2 gap-3">
        {entries.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold flex justify-between">{k}<button type="button" onClick={() => remove(k)} className="text-red-600 text-xs">remove</button></label>
            <input className="px-2.5 py-2 border border-gray-200 rounded-lg text-sm" value={String(v)} onChange={(e) => onChange({ ...value, [k]: e.target.value })} />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <input className="flex-1 px-2.5 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Field name (e.g., gluten_free)" value={draftKey} onChange={(e) => setDraftKey(e.target.value)} />
        <input className="flex-1 px-2.5 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Value" value={draftVal} onChange={(e) => setDraftVal(e.target.value)} />
        <button type="button" onClick={add} className="px-3 py-2 bg-white border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-teal-600">+ Add</button>
      </div>
    </div>
  )
}
