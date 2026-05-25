import type { MedusaContainer } from "@medusajs/framework/types"

// Run nightly at 02:00 — scans stock pools for invariant violations
// (negative on_hand, or reserved exceeding on_hand) and logs each flagged row.
export default async function wmsDriftNightly(container: MedusaContainer) {
  const svc: any = container.resolve("wmsService")
  const logger: any = container.resolve("logger")
  const report = await svc.detectStockDrift({})
  const flagged = report?.flagged ?? []
  if (flagged.length === 0) {
    logger?.info(`[wms-drift-nightly] no drift detected`)
    return
  }
  for (const row of flagged) {
    logger?.warn(
      `[wms-drift-nightly] flag=${row.flag} vendor_id=${row.vendor_id} variant_id=${row.variant_id} on_hand=${row.on_hand} reserved=${row.reserved}`,
    )
  }
}

export const config = {
  name: "wms-drift-nightly",
  schedule: "0 2 * * *",
}
