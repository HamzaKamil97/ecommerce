export const WMS_EVENTS = {
  STOCK_INCREMENTED: "wms.stock.incremented",
  STOCK_DECREMENTED: "wms.stock.decremented",
  RESERVATION_CREATED: "wms.reservation.created",
  RESERVATION_CONSUMED: "wms.reservation.consumed",
  RESERVATION_RELEASED: "wms.reservation.released",
  RESERVATION_EXPIRED: "wms.reservation.expired",
} as const

export type WmsStockEventPayload = {
  vendor_id: string
  variant_id: string
  qty: number
  new_on_hand: number
  source_id?: string
  actor_id?: string
}

export type WmsReservationEventPayload = {
  reservation_id: string
  vendor_id: string
  variant_id: string
  qty: number
  order_id?: string
}
