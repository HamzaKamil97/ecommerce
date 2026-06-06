/**
 * GET /pos/scan/lookup
 *
 * Item-lookup endpoint for the Scan & Go app. Validates a scanned barcode or
 * a typed name-search against the vendor's catalog + live WMS stock.
 *
 * Query params:
 *   vendor_id  (required)
 *   barcode    – exact barcode match → single item response
 *   q          – title substring search (case-insensitive) → { matches: [...] }
 *   (exactly one of barcode or q must be supplied)
 *
 * Price + catalog data mirrors admin/pos-terminal/catalog-snapshot/route.ts:
 *   product.listProducts → JS filter by metadata.created_by_vendor_id, then
 *   bulk raw-SQL price join (product_variant_price_set → price).
 * Stock comes from wmsService.getStock(vendor_id, variant_id).
 * Weigh-at-counter flag: product metadata.weigh_at_counter === true.
 *
 * Single-item response shape (barcode hit):
 *   { found: true, variant_id, title, price_minor, qty_available, weigh_at_counter, sellable }
 *   { found: false }
 *
 * Multi-item response shape (name search):
 *   { matches: [{ variant_id, title, price_minor, qty_available, weigh_at_counter, sellable }, ...] }
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// ---------------------------------------------------------------------------
// Internal catalog row type (shared between barcode + name-search paths)
// ---------------------------------------------------------------------------
interface CatalogRow {
  variant_id: string
  title: string
  barcode: string | null
  price_minor: number
  weigh_at_counter: boolean
}

// ---------------------------------------------------------------------------
// buildCatalogRows — mirrors catalog-snapshot/route.ts approach exactly.
// Copied (not extracted) to avoid changing the snapshot's behaviour.
// See: src/api/admin/pos-terminal/catalog-snapshot/route.ts
// ---------------------------------------------------------------------------
async function buildCatalogRows(
  product: any,
  pg: any,
  vendor_id: string,
): Promise<CatalogRow[]> {
  // List all products, filter by metadata in JS (version-robust).
  let allRows: any[] = []
  for (const relations of [["variants"], []]) {
    const result = await product
      .listProducts({}, { relations, take: 5000 })
      .catch(() => null)
    if (result !== null) {
      allRows = result
      break
    }
  }
  const vendorProducts = allRows.filter(
    (p: any) => (p.metadata as any)?.created_by_vendor_id === vendor_id,
  )

  // Collect all variant IDs.
  const variantIds = vendorProducts
    .flatMap((p: any) => (p.variants ?? []).map((v: any) => v.id))
    .filter(Boolean)

  // Bulk price fetch via raw SQL (no N+1).
  const priceByVariant: Record<string, number> = {}
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
        if (!(row.variant_id in priceByVariant)) {
          priceByVariant[row.variant_id] = Number(row.amount)
        }
      }
    } catch {
      /* pricing tables unavailable in test env — fall through to 0 */
    }
  }

  // Build flat catalog rows.
  const rows: CatalogRow[] = []
  for (const p of vendorProducts) {
    const weigh = (p.metadata as any)?.weigh_at_counter === true
    for (const v of p.variants ?? []) {
      rows.push({
        variant_id: v.id,
        title: `${p.title}${v.title && v.title !== p.title ? " – " + v.title : ""}`,
        barcode: v.barcode ?? null,
        price_minor:
          priceByVariant[v.id] ??
          Number(v.prices?.[0]?.amount ?? 0),
        weigh_at_counter: weigh,
      })
    }
  }

  return rows
}

// ---------------------------------------------------------------------------
// Sellability helper
// ---------------------------------------------------------------------------
interface StockSnap {
  on_hand: number
  reserved: number
  available: number
}

function toMatchItem(
  row: CatalogRow,
  snap: StockSnap,
) {
  const sellable = snap.available > 0 || row.weigh_at_counter
  return {
    variant_id: row.variant_id,
    title: row.title,
    price_minor: row.price_minor,
    qty_available: snap.available,
    weigh_at_counter: row.weigh_at_counter,
    sellable,
  }
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendor_id = req.query.vendor_id as string | undefined
  if (!vendor_id) {
    return res.status(400).json({ error: "vendor_id required" })
  }

  const barcode = req.query.barcode as string | undefined
  const q = req.query.q as string | undefined

  if (!barcode && !q) {
    return res.status(400).json({ error: "barcode or q required" })
  }

  const product: any = req.scope.resolve("product")
  const wms: any = req.scope.resolve("wmsService")
  const pg: any = (req.scope as any).resolve(
    ContainerRegistrationKeys.PG_CONNECTION,
  )

  const catalogRows = await buildCatalogRows(product, pg, vendor_id)

  // ── Barcode lookup ────────────────────────────────────────────────────────
  if (barcode) {
    const row = catalogRows.find((r) => r.barcode === barcode)
    if (!row) {
      return res.json({ found: false })
    }

    let snap: StockSnap = { on_hand: 0, reserved: 0, available: 0 }
    try {
      snap = await wms.getStock(vendor_id, row.variant_id)
    } catch {
      /* wms unavailable — treat as zero stock */
    }

    return res.json({
      found: true,
      ...toMatchItem(row, snap),
    })
  }

  // ── Name search ──────────────────────────────────────────────────────────
  // q is defined here (guard above ensures barcode or q is set)
  const needle = (q as string).toLowerCase()
  const hits = catalogRows
    .filter((r) => r.title.toLowerCase().includes(needle))
    .slice(0, 20) // cap at 20

  // Fan-out stock calls in parallel (no N+1).
  const stockSettled = await Promise.allSettled(
    hits.map((r) => wms.getStock(vendor_id, r.variant_id)),
  )

  const matches = hits.map((row, i) => {
    const s = stockSettled[i]
    const snap: StockSnap =
      s.status === "fulfilled"
        ? s.value ?? { on_hand: 0, reserved: 0, available: 0 }
        : { on_hand: 0, reserved: 0, available: 0 }
    return toMatchItem(row, snap)
  })

  return res.json({ matches })
}
