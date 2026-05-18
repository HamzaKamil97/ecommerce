"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import CategoryPicker from "@/components/create-product/CategoryPicker"
import SchemaForm from "@/components/create-product/SchemaForm"
import CustomFieldsEditor from "@/components/create-product/CustomFieldsEditor"
import MerchTagger from "@/components/create-product/MerchTagger"
import { vendorApi } from "@/lib/api"

type Step = 1 | 2 | 3 | 4

interface WizardState {
  taxonomyHandle: string | null
  coreFields: Record<string, unknown>
  customFields: Record<string, unknown>
  merchCategoryIds: string[]
  product: { title: string; description: string; thumbnail: string; priceCents: string }
}

const init: WizardState = {
  taxonomyHandle: null,
  coreFields: {},
  customFields: {},
  merchCategoryIds: [],
  product: { title: "", description: "", thumbnail: "", priceCents: "" },
}

export default function NewProductPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [state, setState] = useState<WizardState>(init)
  const [me, setMe] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    vendorApi.me().then(setMe).catch((e: any) => setError(e.message))
  }, [])

  const tenantId = me?.tenant?.id ?? ""

  async function submit() {
    if (!state.taxonomyHandle) { setError("Pick a category"); return }
    setSubmitting(true)
    setError(null)
    try {
      const created = await vendorApi.createProduct({
        title: state.product.title,
        description: state.product.description,
        thumbnail: state.product.thumbnail,
        prices: state.product.priceCents
          ? [{ amount: Number(state.product.priceCents), currency_code: "iqd" }]
          : [],
      })
      const productId = created.product?.id ?? created.id
      await vendorApi.assignProductTaxonomy(productId, {
        taxonomy_handle: state.taxonomyHandle!,
        core_fields: state.coreFields,
        custom_fields: state.customFields,
      })
      if (state.merchCategoryIds.length > 0) {
        await vendorApi.setProductMerchCategories(productId, state.merchCategoryIds)
      }
      router.push("/products")
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: 900, padding: "24px 16px" }}>
      <h1 style={{ marginBottom: 24 }}>Create product</h1>
      <Stepper step={step} />

      {error && (
        <div style={{ marginTop: 16, padding: "10px 14px", background: "#2D0A0A", border: "1px solid #7F1D1D", borderRadius: 8, color: "#FCA5A5", fontSize: 13 }}>
          {error}
        </div>
      )}

      {step === 1 && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ marginBottom: 16 }}>Step 1 — Pick a product category</h2>
          <CategoryPicker value={state.taxonomyHandle} onChange={(h) => setState({ ...state, taxonomyHandle: h })} />
          <Nav onBack={null} onNext={() => state.taxonomyHandle && setStep(2)} nextDisabled={!state.taxonomyHandle} />
        </div>
      )}

      {step === 2 && state.taxonomyHandle && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ marginBottom: 16 }}>Step 2 — Fill specs</h2>
          <SchemaForm taxonomyHandle={state.taxonomyHandle} value={state.coreFields} onChange={(v) => setState({ ...state, coreFields: v })} />
          <CustomFieldsEditor value={state.customFields} reservedKeys={Object.keys(state.coreFields)} onChange={(v) => setState({ ...state, customFields: v })} />
          <Nav onBack={() => setStep(1)} onNext={() => setStep(3)} />
        </div>
      )}

      {step === 3 && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ marginBottom: 16 }}>Step 3 — Tag merch categories</h2>
          {tenantId ? (
            <MerchTagger tenantId={tenantId} value={state.merchCategoryIds} onChange={(v) => setState({ ...state, merchCategoryIds: v })} />
          ) : (
            <div className="muted">Loading shop info…</div>
          )}
          <Nav onBack={() => setStep(2)} onNext={() => setStep(4)} />
        </div>
      )}

      {step === 4 && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ marginBottom: 16 }}>Step 4 — Standard fields</h2>
          <StandardFields product={state.product} onChange={(p) => setState({ ...state, product: p })} />
          <Nav onBack={() => setStep(3)} onNext={submit} nextLabel={submitting ? "Creating…" : "Create product"} nextDisabled={submitting || !state.product.title} />
        </div>
      )}
    </div>
  )
}

function Stepper({ step }: { step: Step }) {
  const items = ["Category", "Specs", "Merch tag", "Standard fields"]
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, background: "#1a1a1f", borderRadius: 10, padding: 8 }}>
      {items.map((label, i) => {
        const idx = (i + 1) as Step
        const done = idx < step
        const active = idx === step
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: active ? "#0B0B0F" : "transparent", boxShadow: active ? "0 1px 3px rgba(0,0,0,0.4)" : "none" }}>
            <span style={{ width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, background: done ? "#0F766E" : active ? "#F7F7F8" : "#27272A", color: done ? "#fff" : active ? "#0B0B0F" : "#9CA3AF" }}>
              {done ? "✓" : idx}
            </span>
            <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "#F7F7F8" : done ? "#D1D5DB" : "#6B7280" }}>
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function Nav({ onBack, onNext, nextDisabled, nextLabel }: { onBack: (() => void) | null; onNext: () => void; nextDisabled?: boolean; nextLabel?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, paddingTop: 16, borderTop: "1px solid #27272A" }}>
      {onBack ? (
        <button className="secondary" onClick={onBack}>‹ Back</button>
      ) : (
        <span />
      )}
      <button onClick={onNext} disabled={nextDisabled}>
        {nextLabel ?? "Continue ›"}
      </button>
    </div>
  )
}

function StandardFields({ product, onChange }: { product: any; onChange: (p: any) => void }) {
  return (
    <div className="grid">
      <div>
        <label className="muted">Title *</label>
        <input value={product.title} onChange={(e) => onChange({ ...product, title: e.target.value })} placeholder="e.g. Classic Margherita" />
      </div>
      <div>
        <label className="muted">Price (IQD)</label>
        <input type="number" value={product.priceCents} onChange={(e) => onChange({ ...product, priceCents: e.target.value })} placeholder="e.g. 5000" />
      </div>
      <div>
        <label className="muted">Description</label>
        <textarea rows={4} value={product.description} onChange={(e) => onChange({ ...product, description: e.target.value })} placeholder="Short description shown to customers" />
      </div>
      <div>
        <label className="muted">Thumbnail URL</label>
        <input value={product.thumbnail} onChange={(e) => onChange({ ...product, thumbnail: e.target.value })} placeholder="https://…" />
      </div>
    </div>
  )
}
