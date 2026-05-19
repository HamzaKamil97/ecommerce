import React from 'react'
import { View, StyleSheet } from 'react-native'
import { tokens } from '@/src/theme/tokens'
import { useLanguageStore } from '@/src/store/languageStore'
import { useAuthStore } from '@/src/store/authStore'
import { useCartStore } from '@/src/store/cartStore'
import { localized } from '@/src/i18n/localized'
import { resolveSlotData, isSlotVisible } from '@/src/data/homeLayoutResolver'
import type { HomeSlot, GridItem } from '@/src/types/homeLayout'
import type { DemoShop, HeroSlide, DemoCategory, DemoDeal, DemoBasket } from '@/src/components/home/demo-data'

import { SectionHeader } from './SectionHeader'
import { HeroBanner } from './HeroBanner'
import { CategoriesCarousel } from './CategoriesCarousel'
import { FeaturedShopsCarousel } from './FeaturedShopsCarousel'
import { DealsCarousel } from './DealsCarousel'
import { ActiveBasketsCarousel } from './ActiveBasketsCarousel'
import { PromoStrip } from './PromoStrip'
import { ForYouCarousel } from './ForYouCarousel'
import { ShopRow } from './ShopRow'
import { ShopLogoStrip } from './ShopLogoStrip'
import { MixGrid } from './MixGrid'
import { ProductCardRow, type ProductCardItem } from './ProductCardRow'

interface Props {
  slot: HomeSlot
  onSelectShop: (slug: string) => void
  onSelectProduct: (productId: string) => void
  onSelectCategory: (handle: string) => void
  onSeeAll: (route?: string) => void
}

interface PromoStripPayload {
  icon?: string
  headline: string
  subtext?: string
  bg?: 'teal' | 'saffron'
}

export function ContentSection({
  slot,
  onSelectShop,
  onSelectProduct,
  onSelectCategory,
  onSeeAll,
}: Props) {
  const locale = useLanguageStore((s) => s.locale)
  const customer = useAuthStore((s) => s.customer)
  const cartItems = useCartStore((s) => s.items)

  const data = resolveSlotData(slot, { customer, cartItems })
  if (!isSlotVisible(slot, data, { customer, cartItems })) return null

  const title = slot.title ? localized(slot.title, locale) : null
  const actionLabel = slot.actionLabel ? localized(slot.actionLabel, locale) : null
  const isPromoted = slot.type === 'promoted_shops_slot'

  const handleSeeAll = () => onSeeAll(slot.actionRoute)

  function handleItemPress(slug: string) {
    // TODO(SP-future): wire ad-click tracking endpoint for promoted slots
    if (isPromoted) void slot.sponsorship?.campaignId
    onSelectShop(slug)
  }

  const header =
    title || actionLabel ? (
      <SectionHeader
        title={title ?? ''}
        actionLabel={actionLabel}
        onAction={actionLabel ? handleSeeAll : undefined}
      />
    ) : null

  switch (slot.type) {
    case 'hero_carousel': {
      return (
        <View>
          {header}
          <View style={styles.heroWrap}>
            <HeroBanner slides={data as HeroSlide[]} onCta={() => onSeeAll(slot.actionRoute)} />
          </View>
        </View>
      )
    }
    case 'category_grid':
      return (
        <CategoriesCarousel
          categories={data as DemoCategory[]}
          onSelect={(c) => onSelectCategory(c.handle)}
          onSeeAll={handleSeeAll}
        />
      )
    case 'order_again_strip': {
      const shops = (data as DemoShop[]).map((s) => ({
        slug: s.slug,
        name: s.name,
        logoUrl: s.logoUrl,
      }))
      return (
        <View>
          {header}
          <ShopLogoStrip shops={shops} onPress={handleItemPress} />
        </View>
      )
    }
    case 'picks_for_you_row': {
      return (
        <View>
          {header}
          <ForYouCarousel />
        </View>
      )
    }
    case 'category_product_row': {
      const products = data as Array<{
        id: string
        title: string
        thumbnail: string
        price_minor: number
        currency: 'iqd' | 'usd'
        shopSlug: string
        shopName: string
      }>
      const mapped: ProductCardItem[] = products.map((p) => ({
        id: p.id,
        title: p.title,
        thumbnail: p.thumbnail,
        priceMinor: p.price_minor,
        currency: p.currency,
        shopSlug: p.shopSlug,
        shopName: p.shopName,
      }))
      return (
        <View>
          {header}
          <ProductCardRow products={mapped} onPress={onSelectProduct} />
        </View>
      )
    }
    case 'featured_shops_row':
    case 'promoted_shops_slot': {
      const shops = data as DemoShop[]
      const sponsoredSlug = slot.sponsorship?.advertiserShopSlug
      // Promoted shops slot reuses the cover-card visual; PromotedPill
      // is overlaid via the FeaturedShopsCarousel cards (data-driven via sponsored).
      // For v1 we keep visual identity simple: rely on a single header difference
      // and tag shops as sponsored when this is the promoted slot.
      const decorated = shops.map((s) => ({
        ...s,
        sponsored: isPromoted ? !sponsoredSlug || s.slug === sponsoredSlug : false,
      }))
      return (
        <View>
          {header}
          <FeaturedShopsCarousel
            shops={decorated}
            onSelect={(s) => handleItemPress(s.slug)}
            onSeeAll={() => onSeeAll(slot.actionRoute)}
            hideHeader={Boolean(title || actionLabel)}
          />
        </View>
      )
    }
    case 'inspired_by_past': {
      const items = data as GridItem[]
      return (
        <View>
          {header}
          <MixGrid
            items={items}
            onPressItem={(item) => {
              if (item.kind === 'shop') handleItemPress(item.slug)
              else onSelectProduct(item.id)
            }}
          />
        </View>
      )
    }
    case 'deals_row':
      return (
        <DealsCarousel
          deals={data as DemoDeal[]}
          onSelect={handleSeeAll}
          onSeeAll={handleSeeAll}
          title={title ?? undefined}
        />
      )
    case 'active_baskets_strip': {
      const baskets = data as DemoBasket[]
      return (
        <View>
          {header}
          <ActiveBasketsCarousel
            baskets={baskets}
            onResume={(b) => handleItemPress(b.shopSlug)}
          />
        </View>
      )
    }
    case 'promo_strip': {
      const p = (data as PromoStripPayload) ?? null
      if (!p) return null
      return (
        <PromoStrip
          icon={p.icon}
          headline={p.headline}
          subtext={p.subtext}
          bg={p.bg}
        />
      )
    }
    case 'nearby_shops_list': {
      const shops = data as DemoShop[]
      return (
        <View>
          {header}
          {shops.map((shop) => (
            <ShopRow
              key={shop.slug}
              shop={shop}
              onPress={() => handleItemPress(shop.slug)}
            />
          ))}
        </View>
      )
    }
    case 'vertical_chip_strip':
      return null
    default:
      return null
  }
}

const styles = StyleSheet.create({
  heroWrap: {
    paddingHorizontal: tokens.spacing.lg,
    marginBottom: tokens.spacing.sm,
  },
})
