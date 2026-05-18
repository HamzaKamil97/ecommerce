"use client"
import Link from "next/link"

interface Props {
  itemCount: number
  countryCode: string
}

export default function CartFab({ itemCount, countryCode }: Props) {
  if (itemCount <= 0) return null
  return (
    <Link
      href={`/${countryCode}/cart`}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-teal-700 text-white flex items-center justify-center shadow-lg hover:bg-teal-800 transition-colors"
      aria-label={`Cart with ${itemCount} items`}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
      </svg>
      <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 rounded-full bg-amber-500 text-gray-900 text-[11px] font-extrabold flex items-center justify-center border-2 border-white">
        {itemCount}
      </span>
    </Link>
  )
}
