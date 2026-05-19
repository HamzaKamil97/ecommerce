import { useEffect, useState } from 'react'
import {
  FlatList,
  SafeAreaView,
  ScrollView,
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { getShopBySlug, emojiForVertical, Shop } from '@/src/api/shops'
import { listProducts } from '@/src/api/products'
import { Product } from '@/src/types/product'
import { EmptyState } from '@/src/components/EmptyState'
import { MerchTabs } from '@/src/components/MerchTabs'
import { CartFab } from '@/src/components/CartFab'
import { fetchShopMerchCategories } from '@/src/lib/api/merch'
import { useCartStore } from '@/src/store/cartStore'
import type { MerchCategory } from '@/src/lib/api/types'
import { tokens } from '@/src/theme/tokens'

import { ShopHero } from '@/src/components/shop/ShopHero'
import { ShopInfoBar } from '@/src/components/shop/ShopInfoBar'
import { ShopSearchBox } from '@/src/components/shop/ShopSearchBox'
import { ProductGridCard } from '@/src/components/shop/ProductGridCard'
import {
  HERO_COVERS,
  SHOP_META,
  DEMO_SHOPS,
  DEMO_MERCH_BY_SHOP,
} from '@/src/components/home/demo-data'

// Product from API may include categories; extend locally rather than mutating
// the shared Product type.
interface ProductWithCats extends Product {
  categories?: { id: string; handle: string; name: string }[]
}

function getFirstPrice(product: Product): { amount: number; currencyCode: string } {
  const variant = product.variants?.[0]
  if (variant?.calculated_price) {
    return {
      amount: variant.calculated_price.calculated_amount,
      currencyCode: variant.calculated_price.currency_code ?? 'IQD',
    }
  }
  const price = variant?.prices?.[0]
  return { amount: price?.amount ?? 0, currencyCode: price?.currency_code ?? 'IQD' }
}

function normaliseCurrency(code: string): 'iqd' | 'usd' {
  return code.toLowerCase() === 'usd' ? 'usd' : 'iqd'
}

export default function ShopDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const router = useRouter()
  const itemCount: number = useCartStore((s) => s.itemCount())
  const addItem = useCartStore((s) => s.addItem)

  const [shop, setShop] = useState<Shop | null>(null)
  const [products, setProducts] = useState<ProductWithCats[]>([])
  const [merch, setMerch] = useState<MerchCategory[]>([])
  const [activeMerch, setActiveMerch] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    const slugStr = typeof slug === 'string' ? slug : slug?.[0] ?? ''
    let mounted = true
    ;(async () => {
      setLoading(true)
      let s: Shop | null = null
      try {
        // Race against 1.5s timeout so the screen renders even when the
        // backend is unreachable (e.g., static web preview without CORS).
        s = await Promise.race([
          getShopBySlug(slug),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
        ])
      } catch { s = null }
      if (!mounted) return
      if (!s) {
        // Fallback to demo data when backend isn't reachable (e.g., static
        // web preview without CORS-allowed origin). Lets the screen render.
        const demo = DEMO_SHOPS.find((d) => d.slug === slugStr)
        if (demo) {
          s = {
            id: 'demo-' + demo.slug,
            slug: demo.slug,
            name: demo.name,
            vertical: demo.vertical,
            approval_status: 'approved',
            sales_channel_id: null,
            branding: { logo_url: demo.logoUrl, primary_color: tokens.colors.primary },
          } as unknown as Shop
        }
      }
      setShop(s)
      if (s?.sales_channel_id) {
        const prods = await listProducts({
          // @ts-expect-error custom filter
          sales_channel_id: [s.sales_channel_id],
          limit: 50,
        }).catch(() => [])
        if (mounted) setProducts(prods as ProductWithCats[])
      }
      setLoading(false)
    })()
    return () => { mounted = false }
  }, [slug])

  useEffect(() => {
    if (!slug) return
    const slugStr = typeof slug === 'string' ? slug : slug?.[0] ?? ''
    fetchShopMerchCategories(slug)
      .then((cats) => {
        if (cats.length > 0) {
          setMerch(cats)
          setActiveMerch(cats[0]?.handle ?? null)
        } else {
          // Demo fallback per shop
          const demo = DEMO_MERCH_BY_SHOP[slugStr] ?? []
          setMerch(demo)
          setActiveMerch(demo[0]?.handle ?? null)
        }
      })
      .catch(() => {
        const demo = DEMO_MERCH_BY_SHOP[slugStr] ?? []
        setMerch(demo)
        setActiveMerch(demo[0]?.handle ?? null)
      })
  }, [slug])

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={tokens.colors.primary} />
      </SafeAreaView>
    )
  }

  if (!shop) {
    return (
      <SafeAreaView style={styles.screen}>
        <EmptyState title="Shop not found" subtitle="It may have been removed or is not yet approved." />
      </SafeAreaView>
    )
  }

  const slugStr = typeof slug === 'string' ? slug : slug?.[0] ?? ''

  // Cover: hardcoded map first, then generic fallback
  const coverUrl =
    HERO_COVERS[slugStr] ??
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'

  // Logo from branding or demo data
  const logoUrl =
    shop.branding?.logo_url ??
    DEMO_SHOPS.find((d) => d.slug === slugStr)?.logoUrl ??
    ''

  // Rating / delivery meta — hardcoded until SP-F
  const meta = SHOP_META[slugStr] ?? {
    rating: 4.5,
    ratingCount: 0,
    deliveryMinutes: '30–45',
    minOrder: '5,000 IQD',
    deliveryFee: 'Free',
    isOpen: true,
  }

  // Filter products by active merch handle (via categories on the product)
  const activeProducts: ProductWithCats[] = activeMerch
    ? products.filter((p) =>
        p.categories?.some((c) => c.handle === activeMerch)
      )
    : products

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView style={styles.scroll} stickyHeaderIndices={[3]}>
        {/* 1. Hero cover image */}
        <ShopHero
          coverUrl={coverUrl}
          onBack={() => router.back()}
          onFavorite={() => {}}
          onShare={() => {}}
        />

        {/* 2. Shop info bar — overlaps hero via negative marginTop inside component */}
        <ShopInfoBar
          shop={{
            name: shop.name,
            logoUrl,
            vertical: shop.vertical ?? emojiForVertical(shop.vertical),
            ...meta,
          }}
        />

        {/* 3. Search within shop */}
        <ShopSearchBox shopName={shop.name} onPress={() => {}} />

        {/* 4. Merch tabs — sticky via stickyHeaderIndices={[3]} */}
        {merch.length > 0 ? (
          <MerchTabs
            categories={merch}
            activeHandle={activeMerch}
            onSelect={setActiveMerch}
          />
        ) : (
          <View />
        )}

        {/* 5. Product grid */}
        <View style={styles.gridSection}>
          {activeProducts.length > 0 ? (
            <FlatList
              data={activeProducts}
              numColumns={2}
              keyExtractor={(p) => p.id}
              scrollEnabled={false}
              contentContainerStyle={styles.grid}
              renderItem={({ item }) => {
                const { amount, currencyCode } = getFirstPrice(item)
                return (
                  <ProductGridCard
                    product={{
                      id: item.id,
                      title: item.title,
                      thumbnail: item.thumbnail ?? null,
                      price_minor: amount,
                      currencyCode,
                    }}
                    onPress={() => router.push(`/products/${item.handle}`)}
                    onAdd={() => {
                      const variant = item.variants?.[0]
                      if (!variant) return
                      addItem(
                        {
                          slug: slugStr,
                          name: shop.name,
                          currency: normaliseCurrency(currencyCode),
                        },
                        {
                          variant_id: variant.id,
                          product_id: item.id,
                          product_handle: item.handle,
                          title: item.title,
                          thumbnail: item.thumbnail ?? null,
                          unit_price_minor: amount,
                          currency_code: normaliseCurrency(currencyCode),
                        }
                      )
                    }}
                  />
                )
              }}
            />
          ) : (
            <EmptyState
              title="No products yet"
              subtitle="This shop hasn't published any products. Check back soon."
            />
          )}
        </View>

        {/* Bottom padding so last row stays above FAB */}
        <View style={styles.bottomPad} />
      </ScrollView>

      {/* 6. CartFab */}
      <CartFab itemCount={itemCount} onPress={() => router.push('/(tabs)/cart')} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.colors.surface,
  },
  centered: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  gridSection: {
    backgroundColor: tokens.colors.bg,
    paddingTop: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.sm,
    minHeight: 200,
  },
  grid: {
    paddingBottom: tokens.spacing.lg,
  },
  bottomPad: {
    height: 80,
  },
})
