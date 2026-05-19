import type { Locale } from '@/src/i18n'

export type HomeSlotType =
  | 'hero_carousel'
  | 'category_grid'
  | 'vertical_chip_strip'
  | 'order_again_strip'
  | 'inspired_by_past'
  | 'picks_for_you_row'
  | 'category_product_row'
  | 'featured_shops_row'
  | 'promoted_shops_slot'
  | 'deals_row'
  | 'active_baskets_strip'
  | 'promo_strip'
  | 'nearby_shops_list'

export interface LocalizedString {
  en: string
  ar: string
}

export interface MixRatio {
  shops: number
  products: number
}

export interface SlotSource {
  kind: 'static' | 'mock' | 'endpoint' | 'derived'
  key?: string
  payload?: unknown
  filter?: {
    vertical?: string
    categoryHandle?: string
    limit?: number
  }
}

export interface SponsorshipMeta {
  campaignId: string
  advertiserShopSlug: string
  startsAt: string
  endsAt: string
  label?: string
}

export interface VisibilityRules {
  auth?: 'required' | 'guest_ok'
  nonEmpty?: boolean
  locale?: Array<Locale>
}

export interface HomeSlot {
  id: string
  type: HomeSlotType
  title?: LocalizedString | null
  actionLabel?: LocalizedString | null
  actionRoute?: string
  source: SlotSource
  sponsorship?: SponsorshipMeta
  mixRatio?: MixRatio
  visibleIf?: VisibilityRules
}

export interface HomeLayout {
  version: number
  publishedAt: string
  defaultLocale: Locale
  slots: HomeSlot[]
}

export type GridItem =
  | {
      kind: 'shop'
      slug: string
      name: string
      logoUrl: string
      coverUrl?: string
      sponsored?: boolean
    }
  | {
      kind: 'product'
      id: string
      title: string
      thumbnail: string
      priceMinor: number
      currency: 'iqd' | 'usd'
      shopSlug: string
      shopName?: string
      sponsored?: boolean
    }
