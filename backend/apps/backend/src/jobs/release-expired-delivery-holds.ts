import type { MedusaContainer } from "@medusajs/framework/types"
import { DELIVERY_MODULE } from "../modules/delivery"
import type DeliveryService from "../modules/delivery/service"

// Run every 5 minutes — frees up slots held by abandoned checkouts.
export default async function releaseExpiredDeliveryHolds(container: MedusaContainer) {
  const svc = container.resolve(DELIVERY_MODULE) as DeliveryService
  await svc.releaseExpiredHolds()
}

export const config = {
  name: "release-expired-delivery-holds",
  schedule: "*/5 * * * *",
}
