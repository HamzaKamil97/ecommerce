"use client"
import { useEffect, useState } from "react"
import { fetchLeafSchema } from "@/lib/api/taxonomy"
import type { LeafSchema, FieldDef } from "@/lib/types"

interface Props {
  taxonomyHandle: string
  value: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
}

// Palette — matches CategoryPicker.tsx
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
  fontFamily: "inherit",
  outline: "none",
}

export default function SchemaForm({ taxonomyHandle, value, onChange }: Props) {
  const [schema, setSchema] = useState<LeafSchema | null>(null)

  useEffect(() => {
    let mounted = true
    fetchLeafSchema(taxonomyHandle).then((s) => { if (mounted) setSchema(s) })
    return () => { mounted = false }
  }, [taxonomyHandle])

  if (!schema) return <div style={{ fontSize: 14, color: C.textMuted }}>Loading schema…</div>

  function set(key: string, v: unknown) {
    if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) {
      const next = { ...value }; delete next[key]; onChange(next)
    } else {
      onChange({ ...value, [key]: v })
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {schema.core_fields.map((f) => (
        <FieldEditor key={f.key} field={f} value={value[f.key]} onChange={(v) => set(f.key, v)} />
      ))}
    </div>
  )
}

function FieldEditor({ field, value, onChange }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const spanFull = field.type === "string[]" ? { gridColumn: "span 2" } : {}
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...spanFull }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
        {field.label} {field.required && <span style={{ color: C.danger }}>*</span>}
      </label>
      {renderInput(field, value, onChange)}
      {field.hint && <span style={{ fontSize: 11, color: C.textMuted }}>{field.hint}</span>}
    </div>
  )
}

function renderInput(field: FieldDef, value: unknown, onChange: (v: unknown) => void) {
  if (field.type === "string") {
    return <input style={inputStyle} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
  }
  if (field.type === "number") {
    return (
      <input
        type="number" style={inputStyle}
        min={field.min} max={field.max}
        value={(value as number) ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
      />
    )
  }
  if (field.type === "boolean") {
    return (
      <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, color: C.text }}>
        <input
          type="checkbox" style={{ accentColor: C.primary }}
          checked={(value as boolean) ?? false}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{value ? "Yes" : "No"}</span>
      </label>
    )
  }
  if (field.type === "enum") {
    return (
      <select style={inputStyle} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">Select…</option>
        {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }
  if (field.type === "string[]") {
    const arr = (value as string[]) ?? []
    return <ChipsInput value={arr} options={field.options} onChange={onChange as (v: string[]) => void} />
  }
  return null
}

function ChipsInput({ value, options, onChange }: { value: string[]; options?: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("")
  function add(s: string) {
    const v = s.trim()
    if (!v || value.includes(v)) return
    if (options && !options.includes(v)) return
    onChange([...value, v])
    setDraft("")
  }
  function remove(s: string) { onChange(value.filter((x) => x !== s)) }

  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 4,
      padding: "6px 8px",
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      backgroundColor: C.surface,
    }}>
      {value.map((s) => (
        <span key={s} style={{
          backgroundColor: "#23232b",
          color: C.text,
          padding: "2px 8px", borderRadius: 6, fontSize: 13,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          {s}
          <button type="button" onClick={() => remove(s)} style={{
            background: "none", border: "none", color: C.textMuted,
            fontSize: 11, cursor: "pointer",
          }}>×</button>
        </span>
      ))}
      {options ? (
        <select
          style={{ border: "none", outline: "none", fontSize: 14, background: "transparent", color: C.text }}
          value="" onChange={(e) => add(e.target.value)}
        >
          <option value="">Add…</option>
          {options.filter((o) => !value.includes(o)).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          style={{ border: "none", outline: "none", fontSize: 13, background: "transparent", color: C.text, flex: 1, minWidth: 80, padding: "4px 0" }}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(draft) } }}
          placeholder="Type and press Enter"
        />
      )}
    </div>
  )
}
