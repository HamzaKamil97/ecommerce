import type { MedusaContainer } from "@medusajs/framework/types"
import { POS_MODULE } from "../modules/pos"
import type PosService from "../modules/pos/service"

// Runs every 15 minutes — pulls inventory from each configured POS provider.
// For multi-tenant: iterate over tenants and call sync per their configured provider.

export default async function posInventorySyncJob(container: MedusaContainer) {
  const pos: PosService = container.resolve(POS_MODULE)

  // For now we know only the noop adapter. Real deployments will iterate over
  // distinct pos_provider values found in sku_mapping or pulled from the Tenant module.
  await pos.syncInventoryFromPos("noop")
}

export const config = {
  name: "pos-inventory-sync",
  schedule: "*/15 * * * *", // every 15 minutes
}
