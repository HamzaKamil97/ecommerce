"use client"

export interface ChipDef {
  id: string
  label: string
  active: boolean
  prefix?: string
  hasCaret?: boolean
}

interface Props {
  chips: ChipDef[]
  onToggle: (id: string) => void
}

export default function FilterChips({ chips, onToggle }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
      {chips.map((c) => (
        <button
          key={c.id}
          onClick={() => onToggle(c.id)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-[13px] font-semibold ${
            c.active ? "bg-teal-700 text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          {c.prefix ? `${c.prefix} ` : ""}
          {c.label}
          {c.hasCaret ? " ▾" : ""}
        </button>
      ))}
    </div>
  )
}
