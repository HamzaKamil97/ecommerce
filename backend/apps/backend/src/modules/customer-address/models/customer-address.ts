import { model } from "@medusajs/framework/utils"

// A customer's saved delivery address. tenant_of_customer isolation enforced
// at the API layer (customer-id from auth_context). Soft-deletable.
// Table name uses "delivery_address" to avoid clashing with Medusa's built-in
// customer_address alias registered on the core customer service.
export const CustomerAddress = model.define("delivery_address", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  label: model.text(),
  recipient_name: model.text(),
  phone: model.text(),
  country: model.text().default("IQ"),
  city: model.text(),
  area: model.text().nullable(),
  street: model.text(),
  building: model.text().nullable(),
  floor: model.text().nullable(),
  notes: model.text().nullable(),
  is_default: model.boolean().default(false),
}).indexes([
  { on: ["customer_id"] },
  { on: ["customer_id", "is_default"] },
])
