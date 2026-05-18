export type FieldType = "string" | "number" | "boolean" | "enum" | "string[]"

interface FieldDefBase {
  key: string
  label: string
  required: boolean
  hint?: string
}

export type FieldDef =
  | (FieldDefBase & { type: "string" })
  | (FieldDefBase & { type: "number"; min?: number; max?: number })
  | (FieldDefBase & { type: "boolean" })
  | (FieldDefBase & { type: "enum"; options: string[] })
  | (FieldDefBase & { type: "string[]"; options?: string[] })

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

export interface MerchCategory {
  id: string
  handle: string
  name: string
  position: number
  icon_url: string | null
}
