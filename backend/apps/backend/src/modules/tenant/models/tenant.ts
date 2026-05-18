import { model } from "@medusajs/framework/utils"

// A Tenant is a "shop" inside the marketplace. Each tenant maps to one Medusa SalesChannel.
// Tenants can opt into the "dedicated" plan for white-label apps + custom domain.
export const Tenant = model.define("tenant", {
  id: model.id().primaryKey(),
  slug: model.text().searchable(),
  name: model.text(),
  sales_channel_id: model.text().nullable(),
  vertical: model.enum([
    "food",
    "grocery",
    "home",
    "fashion",
    "electronics",
    "general",
  ]).default("general"),
  display_currency: model.enum(["IQD", "USD"]).default("IQD"),
  show_secondary: model.boolean().default(false),
  plan: model.enum(["marketplace", "dedicated"]).default("marketplace"),
  domain: model.text().nullable(),
  branding: model.json().nullable(), // { logo_url, primary_color, secondary_color, font }
  approval_status: model.enum(["pending", "approved", "suspended"]).default("pending"),
}).indexes([
  { on: ["slug"], unique: true },
  { on: ["sales_channel_id"] },
  { on: ["domain"], unique: true },
])
