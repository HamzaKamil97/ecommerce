import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// Returns the full vendor catalog in a shape the PoS Dexie cache ingests directly.
// Mirrors admin/catalog/manager-products: list-all + JS metadata filter, raw-SQL
// price join (prices live in product_variant_price_set, not on the variant), and
// raw-SQL department-name lookup so the register can filter by department offline.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendor_id = req.query.vendor_id as string | undefined
  if (!vendor_id) return res.status(400).json({ error: "vendor_id required" })

  const product: any = req.scope.resolve("product")
  const wms: any = req.scope.resolve("wmsService")
  const pg: any = (req.scope as any).resolve(ContainerRegistrationKeys.PG_CONNECTION)

  // List all, then filter by metadata.created_by_vendor_id in JS (version-robust).
  let allRows: any[] = []
  for (const relations of [["variants"], []]) {
    const result = await product.listProducts({}, { relations, take: 5000 }).catch(() => null)
    if (result !== null) { allRows = result; break }
  }
  const rows = allRows.filter(
    (p: any) => (p.metadata as any)?.created_by_vendor_id === vendor_id,
  )

  // Bulk price fetch via product_variant_price_set -> price (raw SQL, no N+1).
  const variantIds = rows.flatMap((p: any) => (p.variants ?? []).map((v: any) => v.id)).filter(Boolean)
  const priceByVariant: Record<string, { amount: number; currency_code: string }> = {}
  if (variantIds.length > 0 && pg) {
    try {
      const placeholders = variantIds.map(() => "?").join(", ")
      const r = await pg.raw(
        `SELECT pvps.variant_id, p.amount, p.currency_code
           FROM product_variant_price_set pvps
           JOIN price p ON p.price_set_id = pvps.price_set_id
          WHERE pvps.variant_id IN (${placeholders})
            AND pvps.deleted_at IS NULL AND p.deleted_at IS NULL
          ORDER BY pvps.variant_id, p.created_at ASC`,
        variantIds,
      )
      const priceRows: any[] = r?.rows ?? r ?? []
      for (const row of priceRows) {
        if (!priceByVariant[row.variant_id]) {
          priceByVariant[row.variant_id] = { amount: Number(row.amount), currency_code: row.currency_code }
        }
      }
    } catch { /* pricing tables unavailable (test env) — fall through to 0 */ }
  }

  // Department names: merch_category (id, name) for this vendor.
  const categoryNameById: Record<string, string> = {}
  if (pg) {
    try {
      const r = await pg.raw(
        `SELECT id, name FROM merch_category WHERE vendor_id = ? AND deleted_at IS NULL`,
        [vendor_id],
      )
      const catRows: any[] = r?.rows ?? r ?? []
      for (const row of catRows) categoryNameById[row.id] = row.name
    } catch { /* table absent in test env — names stay null */ }
  }

  // Bulk stock fan-out: all variants in parallel instead of sequential awaits (no N+1).
  // Mirrors the Promise.allSettled pattern in admin/catalog/manager-products/route.ts.
  const stockByVariant: Record<string, number> = {}
  const stockSettled = await Promise.allSettled(
    variantIds.map((vid: string) => wms.getStock(vendor_id, vid))
  )
  variantIds.forEach((vid: string, i: number) => {
    const s = stockSettled[i]
    stockByVariant[vid] = s.status === "fulfilled" ? (s.value?.on_hand ?? 0) : 0
  })

  const items: any[] = []
  for (const p of rows) {
    const merch_category_id = (p.metadata?.merch_category_id as string) ?? null
    for (const v of (p.variants ?? [])) {
      const price = priceByVariant[v.id] ?? null
      const stockQty: number = stockByVariant[v.id] ?? 0
      items.push({
        variant_id: v.id,
        product_id: p.id,
        sku: v.sku ?? null,
        barcode: v.barcode ?? null,
        name: `${p.title}${v.title && v.title !== p.title ? " – " + v.title : ""}`,
        price_minor: price?.amount ?? Number(v.prices?.[0]?.amount ?? 0),
        currency_code: price?.currency_code ?? v.prices?.[0]?.currency_code ?? "iqd",
        image_url: p.thumbnail ?? null,
        thumb_emoji: (p.metadata?.thumb_emoji as string) ?? null,
        merch_category_id,
        category_name: merch_category_id ? (categoryNameById[merch_category_id] ?? null) : null,
        on_hand: stockQty,
      })
    }
  }

  res.json({ vendor_id, items, generated_at: new Date().toISOString() })
}
