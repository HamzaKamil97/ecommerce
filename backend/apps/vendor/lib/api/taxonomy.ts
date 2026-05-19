// Browser fetches /api/medusa/* on the vendor origin (same-origin → no CORS).
// The Next.js proxy at app/api/medusa/[...path]/route.ts forwards to Medusa
// server-side and attaches the publishable key.
import type { LeafSchema, TreeNode } from "../types"

export async function fetchTree(): Promise<TreeNode[]> {
  const r = await fetch(`/api/medusa/store/taxonomy/tree`, { cache: "force-cache" })
  if (!r.ok) return []
  return (await r.json()).tree
}

export async function fetchLeafSchema(handle: string): Promise<LeafSchema | null> {
  const r = await fetch(`/api/medusa/store/taxonomy/leaves/${handle}`, { cache: "force-cache" })
  if (!r.ok) return null
  return (await r.json()).schema
}
