export type FieldType = "string" | "number" | "boolean" | "enum" | "string[]"

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  required: boolean
  min?: number
  max?: number
  options?: string[]
  hint?: string
}

export interface LeafSchema {
  handle: string
  display_name: string
  parent: string
  core_fields: FieldDef[]
}

export interface TreeNode {
  handle: string
  display_name: string
  children: TreeNode[]
}
