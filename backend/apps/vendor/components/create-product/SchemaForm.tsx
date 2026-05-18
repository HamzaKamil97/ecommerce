"use client"
import { useEffect, useState } from "react"
import { fetchLeafSchema } from "@/lib/api/taxonomy"
import type { LeafSchema, FieldDef } from "@/lib/types"

interface Props {
  taxonomyHandle: string
  value: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
}

export default function SchemaForm({ taxonomyHandle, value, onChange }: Props) {
  const [schema, setSchema] = useState<LeafSchema | null>(null)

  useEffect(() => { fetchLeafSchema(taxonomyHandle).then(setSchema) }, [taxonomyHandle])

  if (!schema) return <div className="text-sm text-gray-500">Loading schema…</div>

  function set(key: string, v: unknown) {
    if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) {
      const next = { ...value }; delete next[key]; onChange(next)
    } else {
      onChange({ ...value, [key]: v })
    }
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {schema.core_fields.map((f) => (
        <FieldEditor key={f.key} field={f} value={value[f.key]} onChange={(v) => set(f.key, v)} />
      ))}
    </div>
  )
}

function FieldEditor({ field, value, onChange }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const colSpan = field.type === "string[]" ? "col-span-2" : ""
  return (
    <div className={`flex flex-col gap-1.5 ${colSpan}`}>
      <label className="text-sm font-semibold">
        {field.label} {field.required && <span className="text-red-600">*</span>}
      </label>
      {renderInput(field, value, onChange)}
      {field.hint && <span className="text-[11px] text-gray-500">{field.hint}</span>}
    </div>
  )
}

function renderInput(field: FieldDef, value: unknown, onChange: (v: unknown) => void) {
  const cls = "px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
  if (field.type === "string") {
    return <input className={cls} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
  }
  if (field.type === "number") {
    return <input type="number" className={cls} min={field.min} max={field.max} value={(value as number) ?? ""} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
  }
  if (field.type === "boolean") {
    return <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" className="accent-teal-700" checked={(value as boolean) ?? false} onChange={(e) => onChange(e.target.checked)} /><span>{value ? "Yes" : "No"}</span></label>
  }
  if (field.type === "enum") {
    return (
      <select className={cls} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">Select…</option>
        {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }
  if (field.type === "string[]") {
    return <ChipsInput value={(value as string[]) ?? []} options={field.options} onChange={onChange as (v: string[]) => void} />
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
    <div className="flex flex-wrap gap-1 border border-gray-200 rounded-lg p-1.5 bg-white">
      {value.map((s) => (
        <span key={s} className="bg-gray-100 px-2 py-0.5 rounded text-[13px] flex items-center gap-1">
          {s}<button type="button" onClick={() => remove(s)} className="text-gray-400 text-xs">×</button>
        </span>
      ))}
      {options ? (
        <select className="border-none outline-none text-sm bg-transparent" value="" onChange={(e) => add(e.target.value)}>
          <option value="">Add…</option>
          {options.filter((o) => !value.includes(o)).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input className="border-none outline-none text-sm bg-transparent flex-1 min-w-20" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(draft) } }} placeholder="Type and press Enter" />
      )}
    </div>
  )
}
