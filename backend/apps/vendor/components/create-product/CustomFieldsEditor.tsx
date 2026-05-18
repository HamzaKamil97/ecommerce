"use client"
import { useState } from "react"

interface Props {
  value: Record<string, unknown>
  reservedKeys: string[]
  onChange: (next: Record<string, unknown>) => void
}

const C = {
  bg: "#0B0B0F",
  surface: "#15151B",
  border: "#27272A",
  text: "#F7F7F8",
  textMuted: "#9CA3AF",
  primary: "#0F766E",
  danger: "#DC2626",
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  fontSize: 14,
  backgroundColor: C.surface,
  color: C.text,
  outline: "none",
  fontFamily: "inherit",
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
    <div style={{ background: C.surface, borderRadius: 10, padding: 14 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px", color: C.text }}>Custom fields (optional)</h3>
      <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 12px" }}>
        No validation. Renders below standard specs on the product page.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {entries.map(([k, v]) => (
          <div key={k} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, color: C.text }}>
              {k}
              <button type="button" onClick={() => remove(k)} style={{ background: "none", border: "none", color: C.danger, fontSize: 12, cursor: "pointer" }}>remove</button>
            </label>
            <input style={inputStyle} value={String(v)} onChange={(e) => onChange({ ...value, [k]: e.target.value })} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input style={{ ...inputStyle, flex: 1 }} placeholder="Field name (e.g., gluten_free)" value={draftKey} onChange={(e) => setDraftKey(e.target.value)} />
        <input style={{ ...inputStyle, flex: 1 }} placeholder="Value" value={draftVal} onChange={(e) => setDraftVal(e.target.value)} />
        <button type="button" onClick={add} style={{
          padding: "8px 12px",
          backgroundColor: C.bg,
          color: C.textMuted,
          border: `1px dashed ${C.border}`,
          borderRadius: 8, fontSize: 13, cursor: "pointer",
        }}>+ Add</button>
      </div>
    </div>
  )
}
