import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

// One-off data-hygiene script for local dev (v_test).
//
// The H-3 catalog-schema test fixtures (Lurpak / Bread / Milk / T-Shirt /
// Paracetamol) were created WITHOUT a price set, so the register catalog shows
// them at 0 IQD. This backfills sensible IQD prices by creating a price set in
// the Pricing module and linking it to the variant via the Product↔Pricing
// module link (product_variant_price_set) — the same structure
// createProductsWorkflow produces internally. (updateProductsWorkflow only
// UPDATES an existing price set; it will not create one where none exists.)
//
// Idempotent: only touches v_test variants that currently have no price set.
//
//   npx medusa exec ./src/scripts/backfill-vtest-prices.ts

const VENDOR_ID = "v_test"
const CURRENCY = "iqd"

// Title (without the " – Default" variant suffix) → price in minor units (IQD has no minor unit; treat 1:1).
const PRICE_BY_TITLE: Record<string, number> = {
  "Lurpak Spreadable Slightly Salted": 4500,
  "Bread White Loaf": 1000,
  "Whole Milk 1L": 2750,
  "T-Shirt Medium": 15000,
  "Paracetamol 500mg": 2000,
}

export default async function backfillVtestPrices({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const pg: any = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const product: any = container.resolve(Modules.PRODUCT)
  const pricing: any = container.resolve(Modules.PRICING)
  const link: any = container.resolve(ContainerRegistrationKeys.LINK)

  const all = await product.listProducts({}, { relations: ["variants"], take: 5000 })
  const rows = all.filter(
    (p: any) => (p.metadata as any)?.created_by_vendor_id === VENDOR_ID,
  )

  let updated = 0
  let skipped = 0
  for (const p of rows) {
    const v = (p.variants ?? [])[0]
    if (!v) { logger.warn(`  ${p.title}: no variant, skipping`); continue }

    // Does this variant already have a price row? If so, leave it (idempotent).
    const existing = await pg.raw(
      `SELECT 1
         FROM product_variant_price_set pvps
         JOIN price pr ON pr.price_set_id = pvps.price_set_id
        WHERE pvps.variant_id = ?
          AND pvps.deleted_at IS NULL AND pr.deleted_at IS NULL
        LIMIT 1`,
      [v.id],
    )
    if ((existing?.rows ?? existing ?? []).length > 0) { skipped++; continue }

    const price = PRICE_BY_TITLE[p.title]
    if (price == null) {
      logger.warn(`  ${p.title}: no price mapping and no existing price — leaving at 0`)
      continue
    }

    // 1. Create a price set holding the variant's price.
    const priceSet = await pricing.createPriceSets({
      prices: [{ amount: price, currency_code: CURRENCY }],
    })

    // 2. Link the variant to the price set (populates product_variant_price_set).
    await link.create({
      [Modules.PRODUCT]: { variant_id: v.id },
      [Modules.PRICING]: { price_set_id: priceSet.id },
    })

    logger.info(`  ✓ ${p.title} → ${price} ${CURRENCY.toUpperCase()}`)
    updated++
  }

  logger.info(`Backfill complete. Updated ${updated}, already-priced ${skipped}.`)
}
