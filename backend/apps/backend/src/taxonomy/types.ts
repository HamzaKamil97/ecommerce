export type FieldType = "string" | "number" | "boolean" | "enum" | "string[]"

interface FieldDefBase {
  key: string
  label: string
  required: boolean
  /** Human-readable hint shown under the field in admin UI. */
  hint?: string
}

export type FieldDef =
  | (FieldDefBase & { type: "string" })
  | (FieldDefBase & {
      type: "number"
      /** Minimum allowed value. */
      min?: number
      /** Maximum allowed value. */
      max?: number
    })
  | (FieldDefBase & { type: "boolean" })
  | (FieldDefBase & {
      type: "enum"
      /** Allowed string values. Required for enum. */
      options: string[]
    })
  | (FieldDefBase & {
      type: "string[]"
      /** Optional whitelist of allowed elements. If absent, free-text tags. */
      options?: string[]
    })

export interface LeafSchema {
  /** Dot-namespaced taxonomy handle, e.g. "food.pizza" or "fashion.mens.shirts". */
  handle: string
  /** Human-readable label shown in admin UI and breadcrumbs. */
  display_name: string
  /** Parent handle, e.g. "food" for "food.pizza". */
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
