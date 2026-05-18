"use client"
import { useEffect, useState } from "react"
import { useSearchParams, useRouter, useParams } from "next/navigation"
import FilterChips, { ChipDef } from "@modules/search/components/filter-chips"

interface Result {
  id: string
  handle: string
  title: string
  thumbnail: string | null
  leaf_handle: string | null
}

export default function SearchPage() {
  const params = useSearchParams()
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }
  const q = params.get("q") ?? ""
  const [section, setSection] = useState<string | null>(params.get("section"))
  const [category, setCategory] = useState<string | null>(
    params.get("category")
  )
  const [fastOnly, setFastOnly] = useState(params.get("fast") === "1")
  const [results, setResults] = useState<Result[]>([])

  useEffect(() => {
    const sp = new URLSearchParams()
    if (q) sp.set("q", q)
    if (section) sp.set("section", section)
    if (category) sp.set("category", category)
    if (fastOnly) sp.set("fast", "1")
    const backendUrl =
      process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
    const pk = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""
    fetch(`${backendUrl}/store/products/search?${sp.toString()}`, {
      headers: { "x-publishable-api-key": pk },
    })
      .then((r) => r.json())
      .then((d) => setResults(d.results ?? []))
      .catch(() => setResults([]))
  }, [q, section, category, fastOnly])

  const chips: ChipDef[] = [
    {
      id: "section",
      label: section ? `Section: ${section}` : "Section",
      active: !!section,
      hasCaret: true,
    },
    {
      id: "category",
      label: category ? `Category: ${category}` : "Category",
      active: !!category,
      hasCaret: true,
    },
    { id: "fast", label: "Fast delivery", active: fastOnly, prefix: "⚡" },
  ]

  function onChip(id: string) {
    if (id === "fast") setFastOnly((x) => !x)
    // section/category pickers wired later (open a dropdown picker)
  }

  function onSearch(value: string) {
    router.push(`/${countryCode}/search?q=${encodeURIComponent(value)}`)
  }

  return (
    <div className="px-4 py-4 max-w-screen-xl mx-auto">
      <input
        defaultValue={q}
        placeholder="Search products, shops…"
        className="w-full px-4 py-3 bg-gray-100 rounded-xl"
        onKeyDown={(e) => {
          if (e.key === "Enter")
            onSearch((e.target as HTMLInputElement).value)
        }}
      />
      <FilterChips chips={chips} onToggle={onChip} />
      <div className="text-xs text-gray-500 mb-2">{results.length} results</div>
      <div className="space-y-3">
        {results.map((r) => (
          <a
            key={r.id}
            href={`/${countryCode}/products/${r.handle}`}
            className="flex gap-3 py-3 border-b border-gray-200"
          >
            <div
              className="w-20 h-20 rounded-lg bg-gray-100 shrink-0"
              style={
                r.thumbnail
                  ? {
                      backgroundImage: `url(${r.thumbnail})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : undefined
              }
            />
            <div className="flex-1">
              <h3 className="font-semibold text-[15px]">{r.title}</h3>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
