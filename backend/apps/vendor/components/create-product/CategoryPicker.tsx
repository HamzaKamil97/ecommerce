"use client"
import { useEffect, useState } from "react"
import { fetchTree } from "@/lib/api/taxonomy"
import type { TreeNode } from "@/lib/types"

interface Props {
  value: string | null
  onChange: (handle: string | null) => void
}

// ─── Colours matched to the portal dark theme ────────────────────────────────
const C = {
  bg: "#0B0B0F",
  surface: "#15151B",
  border: "#27272A",
  borderDashed: "#3F3F46",
  text: "#F7F7F8",
  muted: "#9CA3AF",
  active: "#0F766E",          // teal-700
  activeBg: "#042F2E",        // emerald-950
  activeBgLight: "#064E3B",   // emerald-900
  successBg: "#022C22",
  successBorder: "#065F46",
  successText: "#6EE7B7",     // emerald-300
}

export default function CategoryPicker({ value, onChange }: Props) {
  const [tree, setTree] = useState<TreeNode[]>([])
  const [section, setSection] = useState<string | null>(null)
  const [category, setCategory] = useState<string | null>(null)
  const [subcategory, setSubcategory] = useState<string | null>(null)
  const [useSub, setUseSub] = useState(false)

  useEffect(() => {
    fetchTree().then(setTree).catch(() => setTree([]))
  }, [])

  // Restore from value on mount
  useEffect(() => {
    if (!value) return
    const parts = value.split(".")
    setSection(parts[0])
    if (parts.length >= 2) setCategory(parts.slice(0, 2).join("."))
    if (parts.length >= 3) { setSubcategory(value); setUseSub(true) }
  }, [value])

  const sections = tree
  const categories = section
    ? tree.find((s) => s.handle === section)?.children ?? []
    : []
  const subcategories = category
    ? categories.find((c) => c.handle === category)?.children ?? []
    : []

  // Commit selection upward
  useEffect(() => {
    if (useSub && subcategory) onChange(subcategory)
    else if (category) onChange(category)
    else onChange(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, category, subcategory, useSub])

  const colCount = useSub ? 3 : 2

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* ── 2- or 3-column cascade ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${colCount}, 1fr)`,
          gap: 1,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          overflow: "hidden",
          background: C.border, // gap colour
        }}
      >
        <Column
          title="Section"
          items={sections}
          activeHandle={section}
          onPick={(h) => {
            setSection(h)
            setCategory(null)
            setSubcategory(null)
          }}
        />
        <Column
          title="Category"
          items={categories}
          activeHandle={category}
          onPick={(h) => {
            setCategory(h)
            setSubcategory(null)
          }}
        />
        {useSub && (
          <Column
            title="Sub-category"
            items={subcategories}
            activeHandle={subcategory}
            onPick={setSubcategory}
          />
        )}
      </div>

      {/* ── Advanced toggle ── */}
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 14px",
          background: C.surface,
          border: `1px dashed ${C.borderDashed}`,
          borderRadius: 8,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={useSub}
          onChange={(e) => {
            setUseSub(e.target.checked)
            if (!e.target.checked) setSubcategory(null)
          }}
          style={{ accentColor: C.active, width: 15, height: 15, flexShrink: 0 }}
        />
        <span style={{ flex: 1 }}>
          <strong style={{ color: C.text }}>Use sub-category for finer tagging</strong>
          <span style={{ color: C.muted }}>
            {" "}— optional. Useful for fashion sizes, electronics models, home variants. Most
            restaurants leave this off.
          </span>
        </span>
        <span style={{ color: C.muted, fontSize: 11, flexShrink: 0 }}>Advanced</span>
      </label>

      {/* ── Selection breadcrumb ── */}
      {(category || subcategory) && (
        <div
          style={{
            padding: "10px 16px",
            background: C.successBg,
            border: `1px solid ${C.successBorder}`,
            borderRadius: 8,
            fontSize: 13,
            color: C.muted,
          }}
        >
          Selected:{" "}
          <strong style={{ color: C.successText }}>
            {prettyPath(
              useSub && subcategory ? subcategory : (category as string),
              tree
            )}
          </strong>
        </div>
      )}
    </div>
  )
}

// ─── Column sub-component ─────────────────────────────────────────────────────

function Column({
  title,
  items,
  activeHandle,
  onPick,
}: {
  title: string
  items: TreeNode[]
  activeHandle: string | null
  onPick: (h: string) => void
}) {
  return (
    <div
      style={{
        background: C.surface,
        paddingTop: 8,
        paddingBottom: 8,
        maxHeight: 288,
        overflowY: "auto",
      }}
    >
      {/* Column header */}
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: C.muted,
          padding: "0 14px 8px",
          borderBottom: `1px solid ${C.border}`,
          marginBottom: 6,
        }}
      >
        {title}
      </div>

      {/* Items */}
      {items.map((it) => {
        const active = it.handle === activeHandle
        return (
          <div
            key={it.handle}
            onClick={() => onPick(it.handle)}
            style={{
              padding: "6px 14px",
              fontSize: 13,
              cursor: "pointer",
              background: active ? C.activeBg : "transparent",
              color: active ? C.active : C.text,
              fontWeight: active ? 600 : 400,
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => {
              if (!active)
                (e.currentTarget as HTMLDivElement).style.background = "#1C1C24"
            }}
            onMouseLeave={(e) => {
              if (!active)
                (e.currentTarget as HTMLDivElement).style.background = "transparent"
            }}
          >
            {it.display_name}
          </div>
        )
      })}

      {items.length === 0 && (
        <div
          style={{
            padding: "6px 14px",
            fontSize: 12,
            color: C.muted,
            fontStyle: "italic",
          }}
        >
          (empty)
        </div>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function prettyPath(handle: string, tree: TreeNode[]): string {
  if (!handle) return ""
  const parts = handle.split(".")
  const labels: string[] = []
  let nodes: TreeNode[] = tree
  for (let i = 0; i < parts.length; i++) {
    const acc = parts.slice(0, i + 1).join(".")
    const node = nodes.find((n) => n.handle === acc)
    if (node) {
      labels.push(node.display_name)
      nodes = node.children
    }
  }
  return labels.join(" → ")
}
