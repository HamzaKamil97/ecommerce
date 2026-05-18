import type { LeafSchema, TreeNode } from "../types"

const BASE = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export async function fetchTree(): Promise<TreeNode[]> {
  const r = await fetch(`${BASE}/store/taxonomy/tree`, {
    headers: { "x-publishable-api-key": PK },
    cache: "force-cache",
  })
  if (!r.ok) return []
  return (await r.json()).tree
}

export async function fetchLeafSchema(handle: string): Promise<LeafSchema | null> {
  const r = await fetch(`${BASE}/store/taxonomy/leaves/${handle}`, {
    headers: { "x-publishable-api-key": PK },
    cache: "force-cache",
  })
  if (!r.ok) return null
  return (await r.json()).schema
}
