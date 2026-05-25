import type { MedusaContainer } from "@medusajs/framework/types"

// Run every minute — expires reservations past their TTL and frees reserved capacity.
export default async function wmsReservationExpirer(container: MedusaContainer) {
  const svc: any = container.resolve("wmsService")
  const result = await svc.expireReservations()
  if (result?.expired_count > 0) {
    const logger: any = container.resolve("logger")
    logger?.info(`[wms-reservation-expirer] expired ${result.expired_count} reservation(s)`)
  }
}

export const config = {
  name: "wms-reservation-expirer",
  schedule: "* * * * *",
}
