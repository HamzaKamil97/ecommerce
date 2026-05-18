export type FieldType = "string" | "number" | "boolean" | "enum" | "string[]"

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  required: boolean
  /** For number type — minimum allowed value. */
  min?: number
  /** For number type — maximum allowed value. */
  max?: number
  /** For enum and string[] — allowed values. */
  options?: string[]
  /** Human-readable hint shown under the field in admin UI. */
  hint?: string
}

export interface LeafSchema {
  /** Dot-namespaced taxonomy handle, e.g. "food.pizza" or "fashion.mens.shirts". */
  handle: string
  display_name: string
  /** Parent handle. Null only for root sections (not used in v0 — schemas don't live on Sections). */
  parent: string
  core_fields: FieldDef[]
}

export type ValidationReason =
  | "required"          // required field missing
  | "wrong_type"        // value is wrong JS type for the FieldDef
  | "not_in_options"    // enum/string[] value outside options
  | "unknown_key"       // core_fields contains a key not in the schema
  | "out_of_range"      // number outside min/max
  | "collision"         // custom_fields key collides with core_fields key

export interface ValidationError {
  key: string
  reason: ValidationReason
  message: string
}

export type ValidateResult =
  | { ok: true }
  | { ok: false; errors: ValidationError[] }
