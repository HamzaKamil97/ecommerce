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
  DEMO_PRODUCTS_BY_SHOP,
  type DemoProductCard,
} from '@/src/components/home/demo-data'
import { flyToCart } from '@/src/components/cart/FlyToCartHost'

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

// On static web export, useLocalSearchParams may return undefined on first
// render (SSR hydration mismatch). Fall back to window.location.pathname.
function useSlug(): string {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  if (slug) return typeof slug === 'string' ? slug : slug[0] ?? ''
  if (typeof window !== 'undefined') {
    const match = window.location.pathname.match(/\/shops\/([^/?#]+)/)
    if (match) return match[1]
  }
  return ''
}

export default function ShopDetailScreen() {
  const slug = useSlug()
  const router = useRouter()
  const itemCount: number = useCartStore((s) => s.itemCount())
  const addItem = useCartStore((s) => s.addItem)
  const incQty = useCartStore((s) => s.incQty)
  const decQty = useCartStore((s) => s.decQty)
  const cartItems = useCartStore((s) => s.items)

  const [shop, setShop] = useState<Shop | null>(null)
  const [products, setProducts] = useState<ProductWithCats[]>([])
  const [demoProducts, setDemoProducts] = useState<DemoProductCard[]>([])
  const [merch, setMerch] = useState<MerchCategory[]>([])
  const [activeMerch, setActiveMerch] = useState<string | null>(null)
  // loading starts false when we already have a slug (avoids hydration spinner freeze)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) { setLoading(false); return }
    let active = true
    ;(async () => {
      setLoading(true)
      let s: Shop | null = null
      try {
        // Race against 1.5s timeout so the screen renders even when the
        // backend is unreachable (e.g., static web preview without CORS).
        s = await Promise.race([
          getShopBySlug(slug),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 800)),
        ])
      } catch { s = null }
      // NOTE: do NOT early-return on !active here — setLoading(false) must
      // always run to unblock the spinner even during hydration re-mounts.
      if (!s) {
        // Fallback to demo data when backend isn't reachable (e.g., static
        // web preview without CORS-allowed origin). Lets the screen render.
        const demo = DEMO_SHOPS.find((d) => d.slug === slug)
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
      // setShop and setLoading must always run (even if reactive during hydration)
      setShop(s)
      if (s?.sales_channel_id) {
        const prods = await listProducts({
          // @ts-expect-error custom filter
          sales_channel_id: [s.sales_channel_id],
          limit: 50,
        }).catch(() => [])
        if (active) {
          if ((prods as ProductWithCats[]).length > 0) {
            setProducts(prods as ProductWithCats[])
          } else {
            // Backend has no products for this shop — use demo data
            setDemoProducts(DEMO_PRODUCTS_BY_SHOP[slug] ?? [])
          }
        }
      } else {
        // No sales_channel_id (demo shop) — use demo products
        if (active) setDemoProducts(DEMO_PRODUCTS_BY_SHOP[slug] ?? [])
      }
      setLoading(false)
    })()
    return () => { active = false; setLoading(false) }
  }, [slug])

  useEffect(() => {
    if (!slug) return
    fetchShopMerchCategories(slug)
      .then((cats) => {
        if (cats.length > 0) {
          setMerch(cats)
          setActiveMerch(cats[0]?.handle ?? null)
        } else {
          // Demo fallback per shop
          const demo = DEMO_MERCH_BY_SHOP[slug] ?? []
          setMerch(demo)
          setActiveMerch(demo[0]?.handle ?? null)
        }
      })
      .catch(() => {
        const demo = DEMO_MERCH_BY_SHOP[slug] ?? []
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

  // Cover: hardcoded map first, then generic fallback
  const coverUrl =
    HERO_COVERS[slug] ??
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'

  // Logo from branding or demo data
  const logoUrl =
    shop.branding?.logo_url ??
    DEMO_SHOPS.find((d) => d.slug === slug)?.logoUrl ??
    ''

  // Rating / delivery meta — hardcoded until SP-F
  const meta = SHOP_META[slug] ?? {
    rating: 4.5,
    ratingCount: 0,
    deliveryMinutes: '30–45',
    minOrder: '5,000 IQD',
    deliveryFee: 'Free',
    isOpen: true,
  }

  // Filter real products by active merch handle (via categories on the product)
  const activeProducts: ProductWithCats[] = activeMerch
    ? products.filter((p) =>
        p.categories?.some((c) => c.handle === activeMerch)
      )
    : products

  // Unified list: prefer real products, fall back to demo
  const useDemoProducts = activeProducts.length === 0 && demoProducts.length > 0
  // shop is guaranteed non-null here (null case returned above)
  const shopName = shop.name

  function handleDemoAdd(item: DemoProductCard, fromX: number, fromY: number, sourceSize: number) {
    if (item.thumbnail) {
      flyToCart({
        imageUri: item.thumbnail,
        sourceX: fromX,
        sourceY: fromY,
        sourceSize,
        onComplete: () => {
          addItem(
            { slug: slug, name: shopName, currency: item.currency },
            {
              variant_id: `${item.id}-v1`,
              product_id: item.id,
              product_handle: item.id,
              title: item.title,
              thumbnail: item.thumbnail,
              unit_price_minor: item.price_minor,
              currency_code: item.currency,
            }
          )
        },
      })
    } else {
      addItem(
        { slug: slug, name: shopName, currency: item.currency },
        {
          variant_id: `${item.id}-v1`,
          product_id: item.id,
          product_handle: item.id,
          title: item.title,
          thumbnail: null,
          unit_price_minor: item.price_minor,
          currency_code: item.currency,
        }
      )
    }
  }

  function handleRealAdd(item: ProductWithCats, fromX: number, fromY: number, sourceSize: number) {
    const variant = item.variants?.[0]
    if (!variant) return
    const { amount, currencyCode } = getFirstPrice(item)
    if (item.thumbnail) {
      flyToCart({
        imageUri: item.thumbnail,
        sourceX: fromX,
        sourceY: fromY,
        sourceSize,
        onComplete: () => {
          addItem(
            { slug: slug, name: shopName, currency: normaliseCurrency(currencyCode) },
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
        },
      })
    } else {
      addItem(
        { slug: slug, name: shopName, currency: normaliseCurrency(currencyCode) },
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
    }
  }

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
        <ShopSearchBox
          shopName={shop.name}
          onPress={() => router.push('/(tabs)/shops' as never)}
        />

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
          {useDemoProducts ? (
            <FlatList
              data={demoProducts}
              numColumns={2}
              keyExtractor={(p) => p.id}
              scrollEnabled={false}
              contentContainerStyle={styles.grid}
              renderItem={({ item }) => {
                const variantId = `${item.id}-v1`
                const qty = cartItems.find((ci) => ci.variant_id === variantId)?.qty ?? 0
                return (
                  <ProductGridCard
                    product={{
                      id: item.id,
                      title: item.title,
                      thumbnail: item.thumbnail,
                      price_minor: item.price_minor,
                      currencyCode: item.currency.toUpperCase(),
                    }}
                    onPress={() => router.push(`/products/${item.id}`)}
                    onAdd={(fromX, fromY, sourceSize) => handleDemoAdd(item, fromX, fromY, sourceSize)}
                    qty={qty}
                    onIncrement={() => incQty(variantId)}
                    onDecrement={() => decQty(variantId)}
                  />
                )
              }}
            />
          ) : activeProducts.length > 0 ? (
            <FlatList
              data={activeProducts}
              numColumns={2}
              keyExtractor={(p) => p.id}
              scrollEnabled={false}
              contentContainerStyle={styles.grid}
              renderItem={({ item }) => {
                const { amount, currencyCode } = getFirstPrice(item)
                const variantId = item.variants?.[0]?.id ?? ''
                const qty = cartItems.find((ci) => ci.variant_id === variantId)?.qty ?? 0
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
                    onAdd={(fromX, fromY, sourceSize) => handleRealAdd(item, fromX, fromY, sourceSize)}
                    qty={qty}
                    onIncrement={() => variantId && incQty(variantId)}
                    onDecrement={() => variantId && decQty(variantId)}
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
