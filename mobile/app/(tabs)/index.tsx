import React from 'react'
import { SafeAreaView, ScrollView, View, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useCartStore } from '@/src/store/cartStore'
import { tokens } from '@/src/theme/tokens'

import { TopBar } from '@/src/components/home/TopBar'
import { SearchBox } from '@/src/components/home/SearchBox'
import { HeroBanner } from '@/src/components/home/HeroBanner'
import { CategoriesCarousel } from '@/src/components/home/CategoriesCarousel'
import { ActiveBasketsCarousel } from '@/src/components/home/ActiveBasketsCarousel'
import { FeaturedShopsCarousel } from '@/src/components/home/FeaturedShopsCarousel'
import { PromoStrip } from '@/src/components/home/PromoStrip'
import { SectionHeader } from '@/src/components/home/SectionHeader'
import { ShopRow } from '@/src/components/home/ShopRow'
import {
  DEMO_SLIDES,
  DEMO_CATEGORIES,
  DEMO_SHOPS,
  DEMO_ACTIVE_BASKETS,
} from '@/src/components/home/demo-data'

export default function HomeScreen() {
  const router = useRouter()
  const itemCount: number = useCartStore((s) => s.itemCount())

  const hasActiveBaskets = DEMO_ACTIVE_BASKETS.length > 0
  const featuredShops = DEMO_SHOPS.slice(0, 3)
  const nearbyShops = DEMO_SHOPS

  return (
    <SafeAreaView style={styles.safeArea}>
      <TopBar
        location="Deliver to · Baghdad"
        cartCount={itemCount}
        onCart={() => router.push('/(tabs)/cart')}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Search */}
        <View style={styles.searchWrapper}>
          <SearchBox onPress={() => router.push('/(tabs)/shops' as any)} />
        </View>

        {/* Hero banner */}
        <View style={styles.heroBannerWrapper}>
          <HeroBanner slides={DEMO_SLIDES} onCta={() => {}} />
        </View>

        {/* Categories */}
        <CategoriesCarousel
          categories={DEMO_CATEGORIES}
          onSelect={(c) => router.push(`/(tabs)/shops` as any)}
        />

        {/* InstaShop "Continue shopping" — only renders if baskets exist */}
        {hasActiveBaskets && (
          <>
            <SectionHeader title="Continue shopping" actionLabel={null} />
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

        {/* Promo strip */}
        <PromoStrip
          icon="🚚"
          headline="Free delivery over 25,000 IQD"
          subtext="Limited time offer for Baghdad"
          bg="saffron"
        />

        {/* Near you — vertical list */}
        <SectionHeader title="Shops near you" actionLabel="See all" />
        {nearbyShops.map((shop) => (
          <ShopRow
            key={shop.slug}
            shop={shop}
            onPress={() => router.push(`/shops/${shop.slug}`)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
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
