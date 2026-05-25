import { model } from "@medusajs/framework/utils"

export const RESERVATION_STATUSES = ["active", "consumed", "released", "expired"] as const
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number]

// 15-minute soft-hold reservations against stock pools. Created at checkout,
// consumed when a picker confirms the order, released on cancel, expired by
// scheduled job (or lazily on read) when expires_at passes.
export const Reservation = model.define("wms_reservation", {
  id: model.id({ prefix: "rs" }).primaryKey(),
  vendor_id: model.text().searchable(),
  order_id: model.text().searchable(),
  variant_id: model.text().searchable(),
  qty: model.bigNumber(),
  expires_at: model.dateTime(),
  status: model.enum(RESERVATION_STATUSES).default("active"),
  consumed_at: model.dateTime().nullable(),
  released_at: model.dateTime().nullable(),
}).indexes([
  { on: ["vendor_id", "variant_id"] },
  { on: ["expires_at"] },
  { on: ["order_id"] },
])
