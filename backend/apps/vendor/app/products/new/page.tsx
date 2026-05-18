"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import CategoryPicker from "@/components/create-product/CategoryPicker"
import SchemaForm from "@/components/create-product/SchemaForm"
import CustomFieldsEditor from "@/components/create-product/CustomFieldsEditor"
import MerchTagger from "@/components/create-product/MerchTagger"

type Step = 1 | 2 | 3 | 4

interface WizardState {
  taxonomyHandle: string | null
  coreFields: Record<string, unknown>
  customFields: Record<string, unknown>
  merchCategoryIds: string[]
  product: { title: string; handle: string; description: string; thumbnail: string }
}

const init: WizardState = {
  taxonomyHandle: null, coreFields: {}, customFields: {}, merchCategoryIds: [],
  product: { title: "", handle: "", description: "", thumbnail: "" },
}

const C = {
  bg: "#0B0B0F",
  surface: "#15151B",
  border: "#27272A",
  text: "#F7F7F8",
  textMuted: "#9CA3AF",
  primary: "#0F766E",
  primaryText: "white",
  accent: "#F59E0B",
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
  width: "100%",
}

export default function NewProductPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [state, setState] = useState<WizardState>(init)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") ?? "" : ""

  async function submit() {
    if (!state.taxonomyHandle) { setError("Pick a category first"); return }
    if (!state.product.title.trim()) { setError("Title is required"); return }
    if (!state.product.handle.trim()) { setError("Handle is required"); return }
    setSubmitting(true)
    setError(null)
    try {
      // 1. Create the product
      const res = await fetch(`/api/proxy/admin/products`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: state.product.title,
          handle: state.product.handle,
          description: state.product.description,
          thumbnail: state.product.thumbnail,
          status: "published",
        }),
      })
      if (!res.ok) { setError(`Product create failed: ${res.status}`); return }
      const { product } = await res.json()

      // 2. Assign taxonomy
      const t = await fetch(`/api/proxy/admin/products/${product.id}/taxonomy`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          taxonomy_handle: state.taxonomyHandle,
          core_fields: state.coreFields,
          custom_fields: state.customFields,
        }),
      })
      if (!t.ok) {
        const err = await t.json().catch(() => ({ error: "Unknown error" }))
        setError(`Taxonomy assignment failed: ${(err as any).error ?? t.status}`)
        return
      }

      // 3. Attach merch categories
      if (state.merchCategoryIds.length > 0) {
        await fetch(`/api/proxy/admin/products/${product.id}/merch-categories`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ merch_category_ids: state.merchCategoryIds }),
        })
      }

      router.push(`/products/${product.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unexpected error")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24, display: "flex", flexDirection: "column", gap: 24, color: C.text }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Create product</h1>
      <Stepper step={step} />

      {error && (
        <div style={{ padding: "10px 14px", background: "#2D0A0A", border: "1px solid #7F1D1D", borderRadius: 8, color: "#FCA5A5", fontSize: 13 }}>
          {error}
        </div>
      )}

      {step === 1 && (
        <Section title="Step 1 — Pick a product category">
          <CategoryPicker value={state.taxonomyHandle} onChange={(h) => setState({ ...state, taxonomyHandle: h })} />
          <Nav onBack={null} onNext={() => state.taxonomyHandle && setStep(2)} nextDisabled={!state.taxonomyHandle} />
        </Section>
      )}
      {step === 2 && state.taxonomyHandle && (
        <Section title="Step 2 — Fill specs">
          <SchemaForm taxonomyHandle={state.taxonomyHandle} value={state.coreFields} onChange={(v) => setState({ ...state, coreFields: v })} />
          <CustomFieldsEditor
            value={state.customFields}
            reservedKeys={Object.keys(state.coreFields)}
            onChange={(v) => setState({ ...state, customFields: v })}
          />
          <Nav onBack={() => setStep(1)} onNext={() => setStep(3)} />
        </Section>
      )}
      {step === 3 && (
        <Section title="Step 3 — Tag merch categories">
          <MerchTagger tenantId={tenantId} value={state.merchCategoryIds} onChange={(v) => setState({ ...state, merchCategoryIds: v })} />
          <Nav onBack={() => setStep(2)} onNext={() => setStep(4)} />
        </Section>
      )}
      {step === 4 && (
        <Section title="Step 4 — Standard fields">
          <StandardFields product={state.product} onChange={(p) => setState({ ...state, product: p })} />
          <Nav
            onBack={() => setStep(3)}
            onNext={submit}
            nextLabel={submitting ? "Creating…" : "Create product"}
            nextDisabled={submitting || !state.product.title.trim() || !state.product.handle.trim()}
          />
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{title}</h2>
      {children}
    </div>
  )
}

function Stepper({ step }: { step: Step }) {
  const items = ["Category", "Specs", "Merch tag", "Standard fields"]
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, background: C.surface, borderRadius: 10, padding: 8 }}>
      {items.map((label, i) => {
        const idx = (i + 1) as Step
        const done = idx < step
        const active = idx === step
        const bg = active ? C.bg : "transparent"
        const numBg = done ? C.primary : active ? "#374151" : C.border
        const numColor = done || active ? C.primaryText : C.textMuted
        return (
          <div key={label} style={{
            padding: "10px 12px", borderRadius: 8,
            fontSize: 13, fontWeight: 600,
            color: done || active ? C.text : C.textMuted,
            backgroundColor: bg,
            display: "flex", alignItems: "center", gap: 8,
            boxShadow: active ? "0 1px 4px rgba(0,0,0,0.18)" : "none",
          }}>
            <span style={{
              width: 22, height: 22, borderRadius: "50%",
              backgroundColor: numBg, color: numColor,
              display: "grid", placeItems: "center",
              fontSize: 12, fontWeight: 700,
              flexShrink: 0,
            }}>{done ? "✓" : idx}</span>
            {idx}. {label}
          </div>
        )
      })}
    </div>
  )
}

function Nav({ onBack, onNext, nextDisabled, nextLabel }: {
  onBack: (() => void) | null
  onNext: () => void
  nextDisabled?: boolean
  nextLabel?: string
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8 }}>
      {onBack ? (
        <button onClick={onBack} style={{
          padding: "9px 16px", background: C.bg, border: `1px solid ${C.border}`,
          color: C.text, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}>‹ Back</button>
      ) : <span />}
      <button
        onClick={onNext}
        disabled={nextDisabled}
        style={{
          padding: "9px 16px", background: C.primary, color: C.primaryText,
          border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600,
          cursor: nextDisabled ? "not-allowed" : "pointer",
          opacity: nextDisabled ? 0.5 : 1,
        }}
      >{nextLabel ?? "Continue ›"}</button>
    </div>
  )
}

function StandardFields({ product, onChange }: { product: WizardState["product"]; onChange: (p: WizardState["product"]) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <Field label="Title" required>
        <input style={inputStyle} value={product.title} placeholder="e.g. Classic Margherita" onChange={(e) => onChange({ ...product, title: e.target.value })} />
      </Field>
      <Field label="Handle" required>
        <input style={inputStyle} value={product.handle} placeholder="e.g. classic-margherita" onChange={(e) => onChange({ ...product, handle: e.target.value })} />
      </Field>
      <Field label="Description" span={2}>
        <textarea rows={4} style={{ ...inputStyle, resize: "vertical" }} value={product.description} placeholder="Short description shown to customers" onChange={(e) => onChange({ ...product, description: e.target.value })} />
      </Field>
      <Field label="Thumbnail URL" span={2}>
        <input style={inputStyle} value={product.thumbnail} placeholder="https://…" onChange={(e) => onChange({ ...product, thumbnail: e.target.value })} />
      </Field>
    </div>
  )
}

function Field({ label, required, span, children }: { label: string; required?: boolean; span?: number; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: span ? `span ${span}` : undefined }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
        {label} {required && <span style={{ color: C.danger }}>*</span>}
      </label>
      {children}
    </div>
  )
}
