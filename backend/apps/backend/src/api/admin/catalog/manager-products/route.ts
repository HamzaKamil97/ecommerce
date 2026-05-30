import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createProductsWorkflow } from "@medusajs/core-flows"

/**
 * GET /admin/catalog/manager-products?vendor_id=<id>
 *
 * Returns a vendor-scoped product list in a card-friendly shape for the
 * manager Catalog grid. Products are filtered by metadata.created_by_vendor_id
 * (the same field set during data-entry product creation).
 *
 * Response envelope:
 *   { products: ProductCard[] }
 *
 * ProductCard fields:
 *   id, variant_id, merch_category_id, title, sku, barcode,
 *   price_minor, currency_code, stock_qty, thumb_emoji, thumb
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendor_id = req.query.vendor_id as string | undefined
  if (!vendor_id) return res.status(400).json({ error: "vendor_id required" })

  const product: any = req.scope.resolve("product")
  const wms: any = req.scope.resolve("wmsService")
  const pg: any = (req.scope as any).resolve(ContainerRegistrationKeys.PG_CONNECTION)

  // Medusa v2 product module metadata filtering can be unreliable across versions —
  // list all, then filter in JS on the metadata field (same defence as catalog-snapshot).
  let allRows: any[] = []
  for (const relations of [["variants"], []]) {
    const result = await product
      .listProducts({}, { relations, take: 5000 })
      .catch(() => null)
    if (result !== null) { allRows = result; break }
  }

  const rows = allRows.filter(
    (p: any) => (p.metadata as any)?.created_by_vendor_id === vendor_id
  )

  // In Medusa v2 prices live in the pricing module (money_amount table), not
  // on the variant object returned by the product module.  We bulk-fetch all
  // prices for the found variant IDs via a single raw SQL query so we avoid
  // N+1 while staying in the existing project convention (no remoteQuery).
  const variantIds = rows
    .flatMap((p: any) => (p.variants ?? []).map((v: any) => v.id))
    .filter(Boolean)

  const pricesByVariantId: Record<string, { amount: number; currency_code: string }> = {}

  if (variantIds.length > 0 && pg) {
    try {
      // Medusa v2 stores variant prices via: product_variant_price_set → price
      // (the `price` table has price_set_id, amount, currency_code).
      const placeholders = variantIds.map(() => "?").join(", ")
      const sql = `
        SELECT pvps.variant_id,
               p.amount,
               p.currency_code
          FROM product_variant_price_set pvps
          JOIN price p ON p.price_set_id = pvps.price_set_id
         WHERE pvps.variant_id IN (${placeholders})
           AND pvps.deleted_at IS NULL
           AND p.deleted_at IS NULL
         ORDER BY pvps.variant_id, p.created_at ASC
      `
      const r = await pg.raw(sql, variantIds)
      const priceRows: any[] = r?.rows ?? r ?? []
      for (const row of priceRows) {
        if (!pricesByVariantId[row.variant_id]) {
          pricesByVariantId[row.variant_id] = {
            amount: Number(row.amount),
            currency_code: row.currency_code,
          }
        }
      }
    } catch {
      /* pricing tables unavailable in test env — fall through with amount: 0 */
    }
  }

  // Fan out wms.getStock for all first-variant IDs in parallel (mirrors the
  // bulk-price-fetch style above — avoids N+1 sequential awaits).
  const firstVariantIds = rows
    .map((p: any) => (p.variants ?? [])[0]?.id)
    .filter(Boolean) as string[]

  const stockSettled = await Promise.allSettled(
    firstVariantIds.map((vid) => wms.getStock(vendor_id, vid))
  )

  const stockByVariantId: Record<string, number> = {}
  firstVariantIds.forEach((vid, i) => {
    const result = stockSettled[i]
    stockByVariantId[vid] =
      result.status === "fulfilled" ? (result.value?.on_hand ?? 0) : 0
  })

  const products: any[] = []
  for (const p of rows) {
    const v = (p.variants ?? [])[0]
    const priceData = v ? (pricesByVariantId[v.id] ?? null) : null
    const stock_qty = v ? (stockByVariantId[v.id] ?? 0) : 0
    products.push({
      id: p.id,
      variant_id: v?.id ?? null,
      merch_category_id: (p.metadata?.merch_category_id as string) ?? null,
      title: p.title,
      sku: v?.sku ?? null,
      barcode: v?.barcode ?? null,
      price_minor: priceData?.amount ?? Number(v?.prices?.[0]?.amount ?? 0),
      currency_code: priceData?.currency_code ?? v?.prices?.[0]?.currency_code ?? "iqd",
      stock_qty,
      thumb_emoji: (p.metadata?.thumb_emoji as string) ?? null,
      thumb: p.thumbnail ?? null,
    })
  }

  res.json({ products })
}

// ---------------------------------------------------------------------------
// POST /admin/catalog/manager-products
// ---------------------------------------------------------------------------
// Creates a product in the manager's merch bucket.
//
// Decision: uses createProductsWorkflow (not productModule.createProducts) so
// that prices are written to product_variant_price_set and the GET endpoint
// returns the correct price_minor via its raw SQL price join.
// productModule.createProducts() alone does NOT populate product_variant_price_set,
// meaning the GET would always return price_minor: 0 for newly created products.
// ---------------------------------------------------------------------------
type CreateBody = {
  vendor_id: string
  title: string
  price_minor: number
  currency_code: string
  merch_category_id?: string | null
  sku?: string | null
  barcode?: string | null
  initial_on_hand?: number | null
  cost_price_minor?: number | null
  brand?: string | null
  supplier_name?: string | null
  description?: string | null
  tags?: string[]
  low_stock_threshold?: number | null
  internal_notes?: string | null
  schema_fields?: Record<string, unknown>
  thumb_emoji?: string | null
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const b = (req.body ?? {}) as Partial<CreateBody>

  // Validate required fields
  const required = ["vendor_id", "title", "price_minor", "currency_code"] as const
  for (const k of required) {
    if (b[k] == null) return res.status(400).json({ error: `${k} required` })
  }
  const body = b as CreateBody

  // Set audit context so auditLogMiddleware can record vendor_id
  ;(req as any).audit_context = { vendor_id: body.vendor_id }

  const tags = Array.isArray(body.tags) ? body.tags : []

  // Use createProductsWorkflow so prices land in product_variant_price_set
  // and are visible via the GET endpoint's raw SQL price join.
  // Wrap in try/catch: invalid input or workflow errors → 400.
  let result: any
  try {
    const wfResult = await createProductsWorkflow(req.scope).run({
      input: {
        products: [
          {
            title: body.title,
            description: body.description ?? undefined,
            status: "published" as const,
            metadata: {
              created_by_vendor_id: body.vendor_id,
              merch_category_id: body.merch_category_id ?? null,
              cost_price_minor: body.cost_price_minor ?? null,
              brand: body.brand ?? null,
              supplier_name: body.supplier_name ?? null,
              tags,
              low_stock_threshold: body.low_stock_threshold ?? null,
              internal_notes: body.internal_notes ?? null,
              schema_fields: body.schema_fields ?? {},
              thumb_emoji: body.thumb_emoji ?? null,
            },
            options: [{ title: "Default", values: ["Default"] }],
            variants: [
              {
                title: "Default",
                sku: body.sku ?? undefined,
                barcode: body.barcode ?? undefined,
                manage_inventory: false,
                prices: [
                  {
                    amount: Number(body.price_minor),
                    currency_code: body.currency_code,
                  },
                ],
                options: { Default: "Default" },
              },
            ],
          },
        ],
      },
    })
    result = wfResult.result
  } catch (e: any) {
    return res.status(400).json({ error: e.message })
  }

  const p = Array.isArray(result) ? result[0] : result

  if (body.initial_on_hand && Number(body.initial_on_hand) > 0) {
    const variantId = p?.variants?.[0]?.id
    if (!variantId) {
      return res.status(500).json({
        error: "product created without variant id; stock not seeded",
        product_id: p?.id,
      })
    }
    const wms: any = req.scope.resolve("wmsService")
    try {
      await wms.incrementStock({
        vendor_id: body.vendor_id,
        variant_id: variantId,
        qty: Number(body.initial_on_hand),
        type: "restock",
        note: "manager add-product initial on_hand",
      })
    } catch (e: any) {
      return res.status(500).json({
        error: "product created but stock seeding failed",
        product_id: p?.id,
        detail: e.message,
      })
    }
  }

  res.status(201).json({ product: p })
}
