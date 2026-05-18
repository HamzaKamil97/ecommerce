"use client"
import { useState } from "react"
import type { MerchCategory } from "@lib/types/taxonomy"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

interface ProductLite {
  id: string
  handle: string
  title: string
  thumbnail: string | null
  formatted_price?: string
}

interface Props {
  categories: MerchCategory[]
  productsByMerch: Record<string, ProductLite[]>
}

export default function MerchTabs({ categories, productsByMerch }: Props) {
  const [active, setActive] = useState(categories[0]?.handle ?? "")
  const visible = productsByMerch[active] ?? []
  return (
    <>
      <div className="sticky top-16 bg-white border-b border-gray-200 z-10 -mx-4 px-4">
        <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
          {categories.map((c) => (
            <button
              key={c.handle}
              onClick={() => setActive(c.handle)}
              className={`shrink-0 px-3.5 py-2 rounded-full text-sm font-semibold transition-colors ${
                c.handle === active ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
        {visible.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </>
  )
}

function ProductCard({ product }: { product: ProductLite }) {
  return (
    <LocalizedClientLink
      href={`/products/${product.handle}`}
      className="border border-gray-200 rounded-xl overflow-hidden hover:border-teal-700 transition block"
    >
      <div
        className="aspect-square bg-gray-100"
        style={
          product.thumbnail
            ? {
                backgroundImage: `url(${product.thumbnail})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      />
      <div className="p-3">
        <h3 className="font-semibold text-sm mb-1 line-clamp-2">{product.title}</h3>
        <div className="flex justify-between items-center">
          <span className="font-bold text-base">{product.formatted_price ?? ""}</span>
          <span className="w-8 h-8 bg-teal-700 text-white rounded-lg text-lg font-semibold flex items-center justify-center">
            +
          </span>
        </div>
      </div>
    </LocalizedClientLink>
  )
}
