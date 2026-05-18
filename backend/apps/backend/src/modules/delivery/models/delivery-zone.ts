import { model } from "@medusajs/framework/utils"

// A zone is a region a tenant delivers to. Either:
// - polygon: GeoJSON polygon of coordinates
// - postcodes: list of postal codes
// - radius: { center_lat, center_lng, radius_km }
// Implementation chooses one or all.
export const DeliveryZone = model.define("delivery_zone", {
  id: model.id().primaryKey(),
  tenant_id: model.text().searchable(),
  name: model.text(),
  polygon: model.json().nullable(),       // GeoJSON
  postcodes: model.json().nullable(),     // string[]
  center_lat: model.number().nullable(),
  center_lng: model.number().nullable(),
  radius_km: model.number().nullable(),
  delivery_fee_cents: model.number().default(0),
  min_order_cents: model.number().default(0),
  is_active: model.boolean().default(true),
}).indexes([
  { on: ["tenant_id"] },
])
