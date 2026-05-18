import { model } from "@medusajs/framework/utils"

// Recurring weekly delivery windows for a tenant.
// e.g., { day_of_week: 1 (Monday), start_minutes: 540 (9:00 AM), end_minutes: 720 (12:00 PM) }
export const DeliveryWindow = model.define("delivery_window", {
  id: model.id().primaryKey(),
  tenant_id: model.text().searchable(),
  day_of_week: model.number(),         // 0 = Sunday, 6 = Saturday
  start_minutes: model.number(),       // minutes since midnight
  end_minutes: model.number(),
  capacity: model.number().default(20), // max orders per window
  is_active: model.boolean().default(true),
}).indexes([
  { on: ["tenant_id", "day_of_week"] },
])
