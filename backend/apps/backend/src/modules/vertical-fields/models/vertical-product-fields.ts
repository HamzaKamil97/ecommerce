import { model } from "@medusajs/framework/utils"

// Holds vertical-specific custom fields for a product.
// fields shape depends on vertical:
//   food       → { prep_minutes, modifiers, spice_level, allergens, ingredients }
//   grocery    → { unit, weight_per_unit_g, origin, organic, expiry_at }
//   flowers    → { stem_count, vase_required, occasion_tags, delivery_date_required, message_card_allowed }
//   electronics→ { brand, model, specs, warranty_months, in_box_items }
//   fashion    → { sizes, colors, material, gender }
//   pharmacy   → { requires_prescription, dosage, age_restriction, controlled }
//   pets       → { species, breed, age_appropriate }
//   beauty     → { skin_type, ingredients, cruelty_free, vegan }
export const VerticalProductFields = model.define("vertical_product_fields", {
  id: model.id().primaryKey(),
  product_id: model.text().searchable(),
  vertical: model.enum([
    "food",
    "grocery",
    "vegetables",
    "flowers",
    "electronics",
    "fashion",
    "pharmacy",
    "pets",
    "beauty",
    "general",
  ]),
  fields: model.json(),
}).indexes([
  { on: ["product_id"], unique: true },
  { on: ["vertical"] },
])
