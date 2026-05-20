import type { Customer } from '@/src/api/auth'
import type { CartItem } from '@/src/store/cartStore'
import type { GridItem, HomeSlot, MixRatio } from '@/src/types/homeLayout'
import {
  DEMO_SLIDES,
  DEMO_CATEGORIES,
  DEMO_SHOPS,
  DEMO_DEALS,
  DEMO_ACTIVE_BASKETS,
  DEMO_PRODUCTS_BY_SHOP,
  type DemoShop,
} from '@/src/components/home/demo-data'
import { DEMO_FOR_YOU } from '@/src/data/demoForYou'
import { useFilterStore } from '@/src/store/filterStore'

export interface ResolverContext {
  customer: Customer | null
  cartItems: CartItem[]
}

function applyLimit<T>(items: T[], limit?: number): T[] {
  if (!limit || limit <= 0) return items
  return items.slice(0, limit)
}

function applyShopFilters(shops: DemoShop[]): DemoShop[] {
  const f = useFilterStore.getState()
  let out = shops
  if (f.vertical) out = out.filter((s) => s.vertical === f.vertical)
  if (f.minRating !== null) out = out.filter((s) => s.rating >= (f.minRating as number))
  if (f.deliveryUnder !== null) out = out.filter((s) => s.deliveryMinutes <= (f.deliveryUnder as number))
  if (f.sortBy === 'rating') {
    out = [...out].sort((a, b) => b.rating - a.rating)
  } else if (f.sortBy === 'deliveryTime') {
    out = [...out].sort((a, b) => a.deliveryMinutes - b.deliveryMinutes)
  } else if (f.sortBy === 'distance') {
    out = [...out].sort((a, b) => a.deliveryMinutes - b.deliveryMinutes)
  }
  return out
}

const SHOP_SLOT_TYPES = new Set([
  'featured_shops_row',
  'nearby_shops_list',
  'promoted_shops_slot',
])

function flattenProducts(): Array<{
  id: string
  title: string
  thumbnail: string
  price_minor: number
  currency: 'iqd' | 'usd'
  shopSlug: string
  shopName: string
}> {
  const out: Array<{
    id: string
    title: string
    thumbnail: string
    price_minor: number
    currency: 'iqd' | 'usd'
    shopSlug: string
    shopName: string
  }> = []
  for (const shop of DEMO_SHOPS) {
    const products = DEMO_PRODUCTS_BY_SHOP[shop.slug] ?? []
    for (const p of products) {
      out.push({
        id: p.id,
        title: p.title,
        thumbnail: p.thumbnail,
        price_minor: p.price_minor,
        currency: p.currency,
        shopSlug: shop.slug,
        shopName: shop.name,
      })
    }
  }
  return out
}

function synthesizeInspiredByPast(
  ratio: MixRatio,
  limit: number,
  sponsoredShopSlug?: string,
): GridItem[] {
  const shopsPool: GridItem[] = DEMO_SHOPS.map((s) => ({
    kind: 'shop' as const,
    slug: s.slug,
    name: s.name,
    logoUrl: s.logoUrl,
    coverUrl: s.coverUrl,
    sponsored: sponsoredShopSlug ? s.slug === sponsoredShopSlug : false,
  }))
  const productsPool: GridItem[] = flattenProducts().map((p) => ({
    kind: 'product' as const,
    id: p.id,
    title: p.title,
    thumbnail: p.thumbnail,
    priceMinor: p.price_minor,
    currency: p.currency,
    shopSlug: p.shopSlug,
    shopName: p.shopName,
  }))

  const out: GridItem[] = []
  let shopIdx = 0
  let productIdx = 0
  while (out.length < limit && (shopIdx < shopsPool.length || productIdx < productsPool.length)) {
    for (let s = 0; s < ratio.shops && shopIdx < shopsPool.length && out.length < limit; s++) {
      out.push(shopsPool[shopIdx++])
    }
    for (let p = 0; p < ratio.products && productIdx < productsPool.length && out.length < limit; p++) {
      out.push(productsPool[productIdx++])
    }
  }
  return out
}

export function resolveSlotData(slot: HomeSlot, _ctx: ResolverContext): unknown {
  const { source } = slot
  const limit = source.filter?.limit

  if (source.kind === 'static') {
    return source.payload
  }

  if (source.kind === 'endpoint') {
    console.log(`[homeLayoutResolver] endpoint source not wired yet: ${source.key}`)
    return []
  }

  if (source.kind === 'mock') {
    switch (source.key) {
      case 'DEMO_SLIDES':
        return applyLimit(DEMO_SLIDES, limit)
      case 'DEMO_CATEGORIES':
        return applyLimit(DEMO_CATEGORIES, limit)
      case 'DEMO_SHOPS': {
        const filtered = SHOP_SLOT_TYPES.has(slot.type)
          ? applyShopFilters(DEMO_SHOPS)
          : DEMO_SHOPS
        return applyLimit(filtered, limit)
      }
      case 'DEMO_DEALS':
        return applyLimit(DEMO_DEALS, limit)
      case 'DEMO_FOR_YOU':
        return applyLimit(DEMO_FOR_YOU, limit)
      case 'DEMO_PRODUCTS_BY_SHOP': {
        const all = flattenProducts()
        return applyLimit(all, limit ?? 10)
      }
      default:
        console.log(`[homeLayoutResolver] unknown mock key: ${source.key}`)
        return []
    }
  }

  // derived
  switch (source.key) {
    case 'order_again': {
      const shops: DemoShop[] = applyLimit(DEMO_SHOPS, limit ?? 10)
      return shops
    }
    case 'active_baskets':
      return DEMO_ACTIVE_BASKETS
    case 'inspired_by_past': {
      const ratio = slot.mixRatio ?? { shops: 1, products: 2 }
      return synthesizeInspiredByPast(
        ratio,
        limit ?? 8,
        slot.sponsorship?.advertiserShopSlug,
      )
    }
    default:
      console.log(`[homeLayoutResolver] unknown derived key: ${source.key}`)
      return []
  }
}

export function isSlotVisible(
  slot: HomeSlot,
  data: unknown,
  ctx: ResolverContext,
): boolean {
  const v = slot.visibleIf
  if (!v) return true
  if (v.auth === 'required' && !ctx.customer) return false
  if (v.nonEmpty && Array.isArray(data) && data.length === 0) return false
  return true
}
