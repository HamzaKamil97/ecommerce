// JSON schemas describing each vertical's editable fields.
// Vendor portal renders the product-create form by reading these schemas.

export type FieldSchema = {
  key: string
  label: string
  type: "string" | "number" | "boolean" | "select" | "multiselect" | "date" | "datetime" | "tags" | "json"
  required?: boolean
  options?: string[]      // for select / multiselect
  placeholder?: string
  help?: string
}

export type VerticalTemplate = {
  vertical: string
  label: string
  emoji: string
  fields: FieldSchema[]
}

export const VERTICAL_TEMPLATES: Record<string, VerticalTemplate> = {
  food: {
    vertical: "food",
    label: "Food / Restaurant",
    emoji: "🍔",
    fields: [
      { key: "prep_minutes", label: "Preparation time (minutes)", type: "number", required: true, help: "Average kitchen prep time" },
      { key: "spice_level", label: "Spice level", type: "select", options: ["none", "mild", "medium", "hot", "extra_hot"] },
      { key: "modifiers", label: "Modifiers (JSON)", type: "json", help: "[{name, options: [{label, price_delta}]}]" },
      { key: "allergens", label: "Allergens", type: "multiselect", options: ["gluten", "dairy", "nuts", "egg", "soy", "shellfish", "fish"] },
      { key: "ingredients", label: "Ingredients", type: "tags" },
      { key: "calories", label: "Calories", type: "number" },
    ],
  },
  grocery: {
    vertical: "grocery",
    label: "Grocery",
    emoji: "🛒",
    fields: [
      { key: "unit", label: "Unit", type: "select", options: ["each", "kg", "g", "L", "ml"], required: true },
      { key: "weight_per_unit_g", label: "Weight per unit (grams)", type: "number" },
      { key: "origin", label: "Country of origin", type: "string" },
      { key: "organic", label: "Organic", type: "boolean" },
      { key: "expiry_at", label: "Expiry date", type: "date" },
    ],
  },
  vegetables: {
    vertical: "vegetables",
    label: "Vegetables / Produce",
    emoji: "🥕",
    fields: [
      { key: "unit", label: "Unit", type: "select", options: ["each", "kg", "g", "bunch"], required: true },
      { key: "organic", label: "Organic", type: "boolean" },
      { key: "origin", label: "Origin", type: "string" },
      { key: "harvest_date", label: "Harvest date", type: "date" },
    ],
  },
  flowers: {
    vertical: "flowers",
    label: "Flowers",
    emoji: "🌹",
    fields: [
      { key: "stem_count", label: "Stem count", type: "number" },
      { key: "vase_required", label: "Vase required", type: "boolean" },
      { key: "occasion_tags", label: "Occasions", type: "multiselect", options: ["birthday", "anniversary", "wedding", "sympathy", "thankyou", "congratulations"] },
      { key: "delivery_date_required", label: "Customer must pick delivery date", type: "boolean" },
      { key: "message_card_allowed", label: "Allow message card", type: "boolean" },
      { key: "freshness_days", label: "Expected freshness (days)", type: "number" },
    ],
  },
  electronics: {
    vertical: "electronics",
    label: "Electronics",
    emoji: "🎧",
    fields: [
      { key: "brand", label: "Brand", type: "string", required: true },
      { key: "model", label: "Model", type: "string", required: true },
      { key: "specs", label: "Specs (JSON key→value)", type: "json" },
      { key: "warranty_months", label: "Warranty (months)", type: "number" },
      { key: "in_box_items", label: "What's in the box", type: "tags" },
    ],
  },
  fashion: {
    vertical: "fashion",
    label: "Fashion",
    emoji: "👕",
    fields: [
      { key: "sizes", label: "Sizes", type: "multiselect", options: ["XS", "S", "M", "L", "XL", "XXL"] },
      { key: "colors", label: "Colors", type: "tags" },
      { key: "material", label: "Material", type: "string" },
      { key: "gender", label: "Gender", type: "select", options: ["unisex", "men", "women", "kids"] },
      { key: "fit_guide_url", label: "Size guide URL", type: "string" },
    ],
  },
  pharmacy: {
    vertical: "pharmacy",
    label: "Pharmacy",
    emoji: "💊",
    fields: [
      { key: "requires_prescription", label: "Requires prescription", type: "boolean", required: true },
      { key: "dosage", label: "Dosage", type: "string" },
      { key: "age_restriction", label: "Min age", type: "number" },
      { key: "controlled", label: "Controlled substance", type: "boolean" },
      { key: "active_ingredient", label: "Active ingredient", type: "string" },
    ],
  },
  pets: {
    vertical: "pets",
    label: "Pet supplies",
    emoji: "🐾",
    fields: [
      { key: "species", label: "Species", type: "select", options: ["dog", "cat", "bird", "fish", "reptile", "small_mammal"] },
      { key: "age_appropriate", label: "Age appropriate", type: "select", options: ["puppy/kitten", "adult", "senior", "all"] },
      { key: "weight_range_kg", label: "Weight range (kg)", type: "string" },
    ],
  },
  beauty: {
    vertical: "beauty",
    label: "Beauty & Personal Care",
    emoji: "💄",
    fields: [
      { key: "skin_type", label: "Skin type", type: "multiselect", options: ["normal", "oily", "dry", "combination", "sensitive"] },
      { key: "ingredients", label: "Ingredients", type: "tags" },
      { key: "cruelty_free", label: "Cruelty free", type: "boolean" },
      { key: "vegan", label: "Vegan", type: "boolean" },
    ],
  },
  general: {
    vertical: "general",
    label: "General",
    emoji: "🛍️",
    fields: [],
  },
}

export function getTemplate(vertical?: string): VerticalTemplate {
  return VERTICAL_TEMPLATES[vertical ?? "general"] ?? VERTICAL_TEMPLATES.general
}
