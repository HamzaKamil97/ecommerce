import { model } from "@medusajs/framework/utils"

// A concrete slot reserved during checkout. Held briefly before order confirmation.
// On order placement → status: "confirmed". On cart abandon → "released".
export const DeliverySlot = model.define("delivery_slot", {
  id: model.id().primaryKey(),
  tenant_id: model.text().searchable(),
  window_id: model.text(),
  cart_id: model.text().nullable(),
  order_id: model.text().nullable(),
  slot_start: model.dateTime(),       // exact start of slot
  slot_end: model.dateTime(),
  status: model.enum(["held", "confirmed", "released", "delivered", "missed"]).default("held"),
  held_until: model.dateTime().nullable(),
}).indexes([
  { on: ["tenant_id", "slot_start"] },
  { on: ["cart_id"] },
  { on: ["order_id"] },
  { on: ["status"] },
])
