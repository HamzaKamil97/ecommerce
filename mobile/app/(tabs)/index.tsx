import React from 'react'
import { SafeAreaView, ScrollView, View, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useCartStore } from '@/src/store/cartStore'
import { tokens } from '@/src/theme/tokens'
import { t } from '@/src/i18n'
import { useLanguageStore } from '@/src/store/languageStore'

import { TopBar } from '@/src/components/home/TopBar'
import { SearchBox } from '@/src/components/home/SearchBox'
import { HeroBanner } from '@/src/components/home/HeroBanner'
import { CategoriesCarousel } from '@/src/components/home/CategoriesCarousel'
import { ActiveBasketsCarousel } from '@/src/components/home/ActiveBasketsCarousel'
import { FeaturedShopsCarousel } from '@/src/components/home/FeaturedShopsCarousel'
import { PromoStrip } from '@/src/components/home/PromoStrip'
import { DealsCarousel } from '@/src/components/home/DealsCarousel'
import { SectionHeader } from '@/src/components/home/SectionHeader'
import { ShopRow } from '@/src/components/home/ShopRow'
import { ForYouCarousel } from '@/src/components/home/ForYouCarousel'
import {
  DEMO_SLIDES,
  DEMO_CATEGORIES,
  DEMO_SHOPS,
  DEMO_ACTIVE_BASKETS,
  DEMO_DEALS,
} from '@/src/components/home/demo-data'

export default function HomeScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const itemCount: number = useCartStore((s) => s.itemCount())
  // Subscribe to locale so home re-renders on language switch
  useLanguageStore((s) => s.locale)

  const hasActiveBaskets = DEMO_ACTIVE_BASKETS.length > 0
  const featuredShops = DEMO_SHOPS.slice(0, 3)
  const nearbyShops = DEMO_SHOPS


  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: tokens.colors.primary }]}>
      {/* Teal brand band — extends under status bar */}
      <View style={[styles.brandBand, { paddingTop: insets.top }]}>
        <TopBar
          tone="light"
          location={t('home.deliverTo', { city: 'Baghdad' })}
          cartCount={itemCount}
          onCart={() => router.push('/(tabs)/cart')}
          onLocation={() => { /* TODO: open location picker — SP-D */ }}
        />
      </View>

      {/* White body */}
      <View style={styles.body}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Search */}
          <View style={styles.searchWrapper}>
            <SearchBox
              placeholder={t('home.searchPlaceholder')}
              onPress={() => router.push('/(tabs)/shops' as any)}
              onFilter={() => router.push('/(tabs)/shops' as any)}
            />
          </View>

          {/* Hero banner */}
          <View style={styles.heroBannerWrapper}>
            <HeroBanner slides={DEMO_SLIDES} onCta={() => {}} />
          </View>

          {/* Categories */}
          <CategoriesCarousel
            categories={DEMO_CATEGORIES}
            onSelect={() => router.push('/(tabs)/shops' as any)}
          />

          {/* SP-G: AI-framed recommendations row */}
          <SectionHeader title={t('forYou.title')} actionLabel={null} />
          <ForYouCarousel />

          {/* InstaShop "Continue shopping" — only renders if baskets exist */}
          {hasActiveBaskets && (
            <>
              <SectionHeader title={t('home.continueShopping')} actionLabel={null} />
              <ActiveBasketsCarousel
                baskets={DEMO_ACTIVE_BASKETS}
                onResume={(b) => router.push(`/shops/${b.shopSlug}`)}
              />
            </>
          )}

          {/* Featured shops horizontal carousel */}
          <FeaturedShopsCarousel
            shops={featuredShops}
            onSelect={(s) => router.push(`/shops/${s.slug}`)}
          />

          {/* Top deals — same visual pattern as featured shops, image cards */}
          <DealsCarousel
            deals={DEMO_DEALS}
            onSelect={() => router.push('/(tabs)/shops' as any)}
          />

          {/* Promo strip */}
          <PromoStrip
            icon="🚚"
            headline="Free delivery over 25,000 IQD"
            subtext="Limited time offer for Baghdad"
            bg="saffron"
          />

          {/* Near you — vertical list */}
          <SectionHeader title={t('home.shopsNearYou')} actionLabel={t('home.seeAll')} />
          {nearbyShops.map((shop) => (
            <ShopRow
              key={shop.slug}
              shop={shop}
              onPress={() => router.push(`/shops/${shop.slug}`)}
            />
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  brandBand: {
    backgroundColor: tokens.colors.primary,
  },
  body: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
  scrollContent: {
    paddingBottom: 96,
  },
  searchWrapper: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
  },
  heroBannerWrapper: {
    paddingHorizontal: tokens.spacing.lg,
    marginBottom: tokens.spacing.sm,
  },
})
