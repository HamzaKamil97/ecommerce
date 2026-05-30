import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { linkSalesChannelsToApiKeyWorkflow } from "@medusajs/medusa/core-flows"
import { TENANT_MODULE } from "../modules/tenant"
import { WMS_MODULE } from "../modules/wms"
import { POS_TERMINAL_MODULE } from "../modules/pos_terminal"

// Equip ONE tenant end-to-end so the customer→POS loop is live-testable.
// Idempotent: safe to re-run. Override target shop with LOOP_TEST_SLUG.
const SLUG = process.env.LOOP_TEST_SLUG ?? "hamzas-kitchen"
const TARGET_ON_HAND = 50

export default async function seedLoopTest({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const tenantSvc: any = container.resolve(TENANT_MODULE)
  const wms: any = container.resolve(WMS_MODULE)
  const pos: any = container.resolve(POS_TERMINAL_MODULE)

  const tenant = await tenantSvc.getBySlug(SLUG)
  if (!tenant) throw new Error(`tenant "${SLUG}" not found — run seed-demo-shops first`)
  const vendorId = tenant.id
  if (!tenant.sales_channel_id) throw new Error(`tenant ${SLUG} has no sales channel`)

  // 1) Variants in this tenant's sales channel (raw SQL — sales_channels filter unreliable in exec)
  const pg: any = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const variantResult = await pg.raw(
    `SELECT pv.id
       FROM product_variant pv
       JOIN product p ON p.id = pv.product_id
       JOIN product_sales_channel psc ON psc.product_id = p.id
      WHERE psc.sales_channel_id = ?
        AND p.deleted_at IS NULL
        AND pv.deleted_at IS NULL`,
    [tenant.sales_channel_id],
  )
  const variantIds: string[] = (variantResult?.rows ?? variantResult ?? []).map((r: any) => r.id)
  logger.info(`  ${SLUG}: ${variantIds.length} variants`)
  if (variantIds.length === 0) {
    logger.warn(`  ${SLUG}: no variants in sales channel — WMS step is a no-op. Are products linked to this channel?`)
  }

  // 2) WMS stock — top up to TARGET_ON_HAND (idempotent)
  for (const vid of variantIds) {
    const snap = await wms.getStock(vendorId, vid)
    const need = TARGET_ON_HAND - snap.on_hand
    if (need > 0) {
      await wms.incrementStock({
        vendor_id: vendorId, variant_id: vid, qty: need,
        type: "restock", note: "loop-test seed",
      })
    }
  }
  logger.info(`  WMS stock topped to ${TARGET_ON_HAND}/variant`)

  // 3) Link publishable key → this sales channel (so storefront can browse/order)
  const { data: pks } = await query.graph({
    entity: "api_key",
    fields: ["id", "type", "sales_channels.id"],
    filters: { type: "publishable" } as any,
  })
  const pk = pks[0]
  if (!pk) {
    logger.warn(`  No publishable API key found — storefront channel link skipped (storefront browse may fail)`)
  } else {
    const already = (pk.sales_channels ?? []).some(
      (sc: any) => sc.id === tenant.sales_channel_id,
    )
    if (!already) {
      await linkSalesChannelsToApiKeyWorkflow(container).run({
        input: { id: pk.id, add: [tenant.sales_channel_id] },
      })
      logger.info(`  Linked PK ${pk.id} → channel ${tenant.sales_channel_id}`)
    }
  }

  // 4) QA Manager / 4242 cashier (idempotent)
  const existing = await pos.listCashiers(vendorId)
  if (!existing.some((c: any) => c.name === "QA Manager")) {
    await pos.createCashier({
      vendor_id: vendorId, name: "QA Manager", pin: "4242", role: "manager",
    })
    logger.info(`  Created QA Manager / 4242`)
  }

  logger.info("==================================================")
  logger.info(`LOOP TEST READY for "${SLUG}"`)
  logger.info(`  → set backend/apps/pos/.env  VITE_VENDOR_ID=${vendorId}`)
  logger.info("==================================================")
}
