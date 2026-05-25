import { model } from "@medusajs/framework/utils"

// One row per vendor location (single-shop assumption for v1; multi-location is post-MVP).
// Powers the geo radius query that surfaces nearby shops to a customer.
export const ShopLocation = model.define("wms_shop_location", {
  vendor_id: model.text().primaryKey(),
  lat: model.float(),
  lng: model.float(),
  delivery_radius_km: model.float().default(5),
  address_text: model.text().nullable(),
}).indexes([
  { on: ["lat", "lng"] },
])
