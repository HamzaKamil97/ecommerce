import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { syncTaxonomySeedWorkflow } from "../workflows/sync-taxonomy-seed"

// Idempotent taxonomy sync — safe to run on every deploy or whenever the
// product-category tree needs to be reconciled with the seed definition.
//
// Run with:
//   npx medusa exec ./src/scripts/sync-taxonomy.ts
//
// Expected output (fresh DB): ~37 created, 0 updated, 0 unchanged
// Expected output (re-run):    0 created, 0 updated, ~37 unchanged

export default async function syncTaxonomyScript({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    const { result } = await syncTaxonomySeedWorkflow(container).run({})
    logger.info(`[taxonomy] boot sync: ${JSON.stringify(result)}`)
  } catch (err) {
    logger.error(`[taxonomy] boot sync FAILED: ${(err as Error).message}`)
    // Do not crash — the sync can be re-run manually
    throw err
  }
}
