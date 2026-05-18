import type { LeafSchema, FieldDef } from "@lib/types/taxonomy"

interface Props {
  schema: LeafSchema
  coreFields: Record<string, unknown>
  customFields: Record<string, unknown>
}

function isHiddenFromCustomer(f: FieldDef): boolean {
  return (f.hint ?? "").toLowerCase().includes("not shown on product")
}

function formatValue(f: FieldDef, v: unknown): string {
  if (f.type === "boolean") return v ? "Yes" : "No"
  if (f.type === "string[]" && Array.isArray(v)) return v.join(", ")
  return String(v)
}

export default function DetailsPanel({ schema, coreFields, customFields }: Props) {
  const visible = schema.core_fields.filter(
    (f) => coreFields[f.key] !== undefined && coreFields[f.key] !== null && !isHiddenFromCustomer(f)
  )
  const customEntries = Object.entries(customFields ?? {})

  return (
    <div className="space-y-3 mt-4">
      {visible.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Details</span>
          </div>
          {visible.map((f) => (
            <div key={f.key} className="flex justify-between px-4 py-2.5 border-b border-gray-100 last:border-b-0 text-sm">
              <span className="text-gray-500">{f.label}</span>
              <span className="font-medium text-gray-900">{formatValue(f, coreFields[f.key])}</span>
            </div>
          ))}
        </div>
      )}

      {customEntries.length > 0 && (
        <div className="bg-gray-50 rounded-xl px-4 py-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Extras</div>
          {customEntries.map(([k, v]) => (
            <div key={k} className="flex justify-between py-1 text-[13px]">
              <span className="text-gray-500">{k}</span>
              <span className="font-medium text-gray-900">{String(v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
