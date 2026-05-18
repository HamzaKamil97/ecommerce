import type { LeafSchema, FieldDef, ValidationError, ValidateResult } from "./types"

function err(key: string, reason: ValidationError["reason"], message: string): ValidationError {
  return { key, reason, message }
}

function checkType(field: FieldDef, value: unknown): ValidationError | null {
  switch (field.type) {
    case "string":
      return typeof value === "string" ? null : err(field.key, "wrong_type", `expected string`)
    case "number":
      if (typeof value !== "number" || Number.isNaN(value)) {
        return err(field.key, "wrong_type", `expected number`)
      }
      if (field.min !== undefined && value < field.min) {
        return err(field.key, "out_of_range", `${field.key} < ${field.min}`)
      }
      if (field.max !== undefined && value > field.max) {
        return err(field.key, "out_of_range", `${field.key} > ${field.max}`)
      }
      return null
    case "boolean":
      return typeof value === "boolean" ? null : err(field.key, "wrong_type", `expected boolean`)
    case "enum":
      if (typeof value !== "string") return err(field.key, "wrong_type", `expected string`)
      if (!field.options.includes(value)) {
        return err(field.key, "not_in_options", `"${value}" not in [${field.options.join(", ")}]`)
      }
      return null
    case "string[]":
      if (!Array.isArray(value) || !value.every((v) => typeof v === "string")) {
        return err(field.key, "wrong_type", `expected string[]`)
      }
      if (field.options) {
        const bad = value.find((v) => !field.options!.includes(v))
        if (bad !== undefined) {
          return err(field.key, "not_in_options", `"${bad}" not in [${field.options.join(", ")}]`)
        }
      }
      return null
  }
}

export function validateCoreFields(
  schema: LeafSchema,
  values: Record<string, unknown>
): ValidateResult {
  const errors: ValidationError[] = []
  const declaredKeys = new Set(schema.core_fields.map((f) => f.key))

  // 1. Unknown keys
  for (const key of Object.keys(values)) {
    if (!declaredKeys.has(key)) {
      errors.push(err(key, "unknown_key", `"${key}" is not in schema ${schema.handle}`))
    }
  }

  // 2. For each declared field: required check + type check
  for (const field of schema.core_fields) {
    const value = values[field.key]
    const isMissing = value === undefined || value === null
    if (field.required && isMissing) {
      errors.push(err(field.key, "required", `${field.key} is required`))
      continue
    }
    if (isMissing) continue
    const typeErr = checkType(field, value)
    if (typeErr) errors.push(typeErr)
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors }
}
