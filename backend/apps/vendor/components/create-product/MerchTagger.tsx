"use client"
import { useEffect, useState } from "react"

interface MerchCat { id: string; name: string }
interface Props {
  tenantId: string
  value: string[]
  onChange: (next: string[]) => void
}

const C = {
  bg: "#0B0B0F",
  surface: "#15151B",
  border: "#27272A",
  text: "#F7F7F8",
  textMuted: "#9CA3AF",
  primary: "#0F766E",
  primaryText: "white",
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

export default function MerchTagger({ tenantId, value, onChange }: Props) {
  const [cats, setCats] = useState<MerchCat[]>([])
  const [newName, setNewName] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => { reload() }, [tenantId])

  async function reload() {
    if (!tenantId) return
    try {
      const r = await fetch(`/api/proxy/admin/tenants/${tenantId}/merch-categories`, { credentials: "include" })
      if (r.ok) setCats((await r.json()).merch_categories ?? [])
    } catch (e) {
      console.error("merch reload failed:", e)
    }
  }

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])
  }

  async function createInline() {
    if (!newName.trim()) return
    setLoading(true)
    try {
      const r = await fetch(`/api/proxy/admin/tenants/${tenantId}/merch-categories`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (r.ok) { setNewName(""); await reload() }
      else alert(`Failed: ${r.status}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {cats.length === 0 && (
          <div style={{ fontSize: 13, color: C.textMuted, fontStyle: "italic" }}>
            No merch categories yet for this shop. Create one below.
          </div>
        )}
        {cats.map((c) => {
          const active = value.includes(c.id)
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              style={{
                padding: "6px 12px", borderRadius: 999,
                fontSize: 14, fontWeight: 600,
                border: "none", cursor: "pointer",
                backgroundColor: active ? C.primary : C.surface,
                color: active ? C.primaryText : C.textMuted,
              }}
            >
              {c.name}
            </button>
          )
        })}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          style={{ ...inputStyle, flex: 1 }}
          placeholder="+ Create new merch category"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); createInline() } }}
        />
        <button
          type="button"
          onClick={createInline}
          disabled={loading || !newName.trim()}
          style={{
            padding: "8px 14px",
            backgroundColor: "#0B0B0F",
            color: C.text,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            fontSize: 14, fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
            opacity: !newName.trim() ? 0.5 : 1,
          }}
        >
          {loading ? "Creating…" : "Create"}
        </button>
      </div>
    </div>
  )
}
