import { model } from "@medusajs/framework/utils"

// Customer's address book — used to pre-fill checkout, match delivery zones, save favorites.
export const CustomerAddress = model.define("saved_address", {
  id: model.id().primaryKey(),
  customer_id: model.text().searchable(),
  label: model.text().nullable(),     // "Home", "Work", "Mum's place"
  recipient_name: model.text().nullable(),
  phone: model.text().nullable(),
  street: model.text(),
  building: model.text().nullable(),
  apartment: model.text().nullable(),
  city: model.text(),
  region: model.text().nullable(),
  postcode: model.text().nullable(),
  country_code: model.text(),
  lat: model.number().nullable(),
  lng: model.number().nullable(),
  delivery_instructions: model.text().nullable(),
  is_default: model.boolean().default(false),
}).indexes([
  { on: ["customer_id", "is_default"] },
])
