"use client"
import { useEffect, useState } from "react"
import { vendorApi } from "@/lib/api"

interface MerchCat { id: string; name: string }
interface Props {
  tenantId: string
  value: string[]
  onChange: (next: string[]) => void
}

export default function MerchTagger({ tenantId, value, onChange }: Props) {
  const [cats, setCats] = useState<MerchCat[]>([])
  const [newName, setNewName] = useState("")

  useEffect(() => { reload() }, [tenantId])

  async function reload() {
    try {
      const list = await vendorApi.listMerchCategories(tenantId)
      setCats(list)
    } catch (e: any) {
      console.error(e)
    }
  }

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])
  }

  async function createInline() {
    if (!newName.trim()) return
    try {
      await vendorApi.createMerchCategory(tenantId, { name: newName.trim() })
      setNewName("")
      await reload()
    } catch (e: any) {
      alert(`Failed: ${e.message}`)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {cats.length === 0 && <div className="text-sm text-gray-500">No merch categories yet. Create one below.</div>}
        {cats.map((c) => (
          <button key={c.id} type="button" onClick={() => toggle(c.id)} className={`px-3 py-1.5 rounded-full text-sm font-semibold ${value.includes(c.id) ? "bg-teal-700 text-white" : "bg-gray-100 text-gray-600"}`}>
            {c.name}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input className="flex-1 px-2.5 py-2 border border-gray-200 rounded-lg text-sm" placeholder="+ Create new merch category" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button type="button" onClick={createInline} className="px-3 py-2 bg-gray-900 text-white rounded-lg text-sm">Create</button>
      </div>
    </div>
  )
}
