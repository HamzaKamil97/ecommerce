import "server-only"
import { LeafSchema, TreeNode } from "../types/taxonomy"

const BACKEND = process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export async function getTaxonomyTree(): Promise<TreeNode[]> {
  const r = await fetch(`${BACKEND}/store/taxonomy/tree`, {
    headers: { "x-publishable-api-key": PK },
    next: { revalidate: 300, tags: ["taxonomy"] },
  })
  if (!r.ok) return []
  const data = await r.json()
  return data.tree
}

export async function getLeafSchema(handle: string): Promise<LeafSchema | null> {
  const r = await fetch(`${BACKEND}/store/taxonomy/leaves/${handle}`, {
    headers: { "x-publishable-api-key": PK },
    next: { revalidate: 300, tags: [`taxonomy-leaf-${handle}`] },
  })
  if (!r.ok) return null
  const data = await r.json()
  return data.schema
}
