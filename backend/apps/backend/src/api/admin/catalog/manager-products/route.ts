import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

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

  const products: any[] = []
  for (const p of rows) {
    const v = (p.variants ?? [])[0]
    const priceData = v ? (pricesByVariantId[v.id] ?? null) : null
    let stock_qty = 0
    if (v) {
      try {
        stock_qty = (await wms.getStock(vendor_id, v.id)).on_hand
      } catch {
        /* no stock record yet — treat as 0 */
      }
    }
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
