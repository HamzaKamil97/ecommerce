import { MedusaService } from "@medusajs/framework/utils"
import { DeliveryZone } from "./models/delivery-zone"
import { DeliveryWindow } from "./models/delivery-window"
import { DeliverySlot } from "./models/delivery-slot"

class DeliveryService extends MedusaService({
  DeliveryZone,
  DeliveryWindow,
  DeliverySlot,
}) {
  // ===== Zones =====

  async findZoneForAddress(tenantId: string, address: { lat?: number; lng?: number; postcode?: string }) {
    const zones = await this.listDeliveryZones({ tenant_id: tenantId, is_active: true })
    for (const z of zones) {
      // 1) postcode match
      if (address.postcode && Array.isArray(z.postcodes) && (z.postcodes as string[]).includes(address.postcode)) {
        return z
      }
      // 2) radius from center
      if (address.lat && address.lng && z.center_lat && z.center_lng && z.radius_km) {
        const dist = haversineKm(address.lat, address.lng, z.center_lat, z.center_lng)
        if (dist <= z.radius_km) return z
      }
      // (3) polygon — skipped, requires turf.js; implement when needed
    }
    return null
  }

  // ===== Available slots =====

  /**
   * Compute available delivery slots for the next `days` days for a tenant.
   * A "slot" is one window's start..end on a specific date, minus current bookings.
   */
  async listAvailableSlots(tenantId: string, days = 7): Promise<Array<{ window_id: string; start: Date; end: Date; remaining: number }>> {
    const windows = await this.listDeliveryWindows({ tenant_id: tenantId, is_active: true })
    if (windows.length === 0) return []

    const now = new Date()
    const horizon = new Date(now.getTime() + days * 24 * 3600 * 1000)
    const result: Array<{ window_id: string; start: Date; end: Date; remaining: number }> = []

    for (let d = 0; d < days; d++) {
      const day = new Date(now)
      day.setDate(day.getDate() + d)
      const dow = day.getDay()
      for (const w of windows.filter((x) => x.day_of_week === dow)) {
        const start = new Date(day)
        start.setHours(0, w.start_minutes, 0, 0)
        const end = new Date(day)
        end.setHours(0, w.end_minutes, 0, 0)
        if (end <= now) continue
        if (start >= horizon) continue

        const held = await this.listDeliverySlots({
          tenant_id: tenantId,
          window_id: w.id,
          slot_start: start,
          status: ["held", "confirmed"] as any,
        }).catch(() => [])
        const remaining = Math.max(0, w.capacity - held.length)
        if (remaining > 0) result.push({ window_id: w.id, start, end, remaining })
      }
    }
    return result
  }

  // ===== Hold a slot during checkout =====

  async holdSlot(params: {
    tenant_id: string
    cart_id: string
    window_id: string
    slot_start: Date
    slot_end: Date
    hold_minutes?: number
  }) {
    const heldUntil = new Date(Date.now() + (params.hold_minutes ?? 15) * 60 * 1000)
    return (this as any).createDeliverySlots({
      tenant_id: params.tenant_id,
      window_id: params.window_id,
      cart_id: params.cart_id,
      slot_start: params.slot_start,
      slot_end: params.slot_end,
      status: "held",
      held_until: heldUntil,
    })
  }

  async confirmSlotForOrder(slotId: string, orderId: string) {
    return (this as any).updateDeliverySlots({
      id: slotId,
      order_id: orderId,
      status: "confirmed",
      held_until: null,
    })
  }

  async releaseExpiredHolds() {
    const now = new Date()
    const expired = await this.listDeliverySlots({ status: "held" })
    const toRelease = expired.filter((s) => s.held_until && new Date(s.held_until) < now)
    for (const s of toRelease) {
      await (this as any).updateDeliverySlots({ id: s.id, status: "released" })
    }
    return { released: toRelease.length }
  }
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export default DeliveryService
