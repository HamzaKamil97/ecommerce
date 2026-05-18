import { model } from "@medusajs/framework/utils"

// A Vendor is a user account that manages products on behalf of a Tenant.
// One user can own/collaborate on multiple tenants (rare); typical case: one vendor → one tenant.
export const Vendor = model.define("vendor", {
  id: model.id().primaryKey(),
  user_id: model.text().searchable(),
  tenant_id: model.text().searchable(),
  role: model.enum(["owner", "manager", "staff"]).default("owner"),
  email: model.text(),
  display_name: model.text().nullable(),
  is_active: model.boolean().default(true),
}).indexes([
  { on: ["user_id", "tenant_id"], unique: true },
  { on: ["tenant_id"] },
])
