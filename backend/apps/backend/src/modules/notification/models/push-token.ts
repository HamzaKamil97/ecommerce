import { model } from "@medusajs/framework/utils"

// FCM / APNs / Expo push token. One user can have multiple devices.
export const PushToken = model.define("push_token", {
  id: model.id().primaryKey(),
  user_id: model.text().searchable(),    // customer or vendor user id
  user_type: model.enum(["customer", "vendor", "driver"]).default("customer"),
  token: model.text(),
  platform: model.enum(["ios", "android", "web", "expo"]).default("expo"),
  device_name: model.text().nullable(),
  is_active: model.boolean().default(true),
}).indexes([
  { on: ["user_id"] },
  { on: ["token"], unique: true },
])
