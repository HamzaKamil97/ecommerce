import { model } from "@medusajs/framework/utils"

// In-app inbox + delivery audit for push/email/sms attempts.
export const NotificationRecord = model.define("notification_record", {
  id: model.id().primaryKey(),
  user_id: model.text().searchable(),
  channel: model.enum(["push", "email", "sms", "in_app"]),
  template: model.text(),                // e.g. "order.placed"
  title: model.text(),
  body: model.text(),
  data: model.json().nullable(),
  read_at: model.dateTime().nullable(),
  delivered_at: model.dateTime().nullable(),
  delivery_status: model.enum(["pending", "sent", "delivered", "failed", "read"]).default("pending"),
  error: model.text().nullable(),
}).indexes([
  { on: ["user_id", "channel"] },
  { on: ["delivery_status"] },
])
