import { LeafSchema, TreeNode } from "./types"

const BASE = process.env.EXPO_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PK = process.env.EXPO_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY ?? ""

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "x-publishable-api-key": PK, accept: "application/json" },
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} on ${path}`)
  return (await res.json()) as T
}

export async function fetchTaxonomyTree(): Promise<TreeNode[]> {
  const data = await fetchJson<{ tree: TreeNode[] }>("/store/taxonomy/tree")
  return data.tree
}

export async function fetchLeafSchema(handle: string): Promise<LeafSchema | null> {
  try {
    const data = await fetchJson<{ schema: LeafSchema }>(`/store/taxonomy/leaves/${handle}`)
    return data.schema
  } catch (e: any) {
    if (e.message?.startsWith("404")) return null
    throw e
  }
}
