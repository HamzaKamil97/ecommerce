import { useEffect, useState, useRef } from 'react'
import { ScrollView, View, Text, ActivityIndicator, SafeAreaView, Pressable, StyleSheet } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getProduct, getProductVerticalFields, VerticalFields } from '@/src/api/products'
import { Product } from '@/src/types/product'
import { useCartStore } from '@/src/store/cartStore'
import { DetailsPanel } from '@/src/components/DetailsPanel'
import { CartFab } from '@/src/components/CartFab'
import { PriceText } from '@/src/components/PriceText'
import { fetchLeafSchema } from '@/src/lib/api/taxonomy'
import type { LeafSchema } from '@/src/lib/api/types'
import { useFlyToCart } from '@/src/hooks/useFlyToCart'
import { tokens } from '@/src/theme/tokens'
import { ImageCarousel } from '@/src/components/product/ImageCarousel'
import { ShopBadge } from '@/src/components/product/ShopBadge'
import { StickyAddToCart } from '@/src/components/product/StickyAddToCart'
import { DEMO_PRODUCTS } from '@/src/components/home/demo-data'

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const addItem = useCartStore((s) => s.addItem)
  const itemCount: number = useCartStore((s) => s.itemCount())
  const imgRef = useRef<View>(null)
  const fly = useFlyToCart()

  const [product, setProduct] = useState<Product | null>(null)
  const [demoProduct, setDemoProduct] = useState<typeof DEMO_PRODUCTS[string] | null>(null)
  const [verticalData, setVerticalData] = useState<VerticalFields | null>(null)
  const [schema, setSchema] = useState<LeafSchema | null>(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (!id) return
    const timeout = new Promise<null>((_, rej) => setTimeout(() => rej(new Error('timeout')), 1500))
    Promise.race([
      Promise.all([
        getProduct(id),
        getProductVerticalFields(id).catch(() => null),
      ]).then((results) => results),
      timeout,
    ])
      .then((result) => {
        if (!result) return
        const [p, vf] = result as [Product, VerticalFields | null]
        setProduct(p)
        setVerticalData(vf)
      })
      .catch(() => {
        // fallback: look up in DEMO_PRODUCTS by handle
        const demo = DEMO_PRODUCTS[id] ?? Object.values(DEMO_PRODUCTS)[0] ?? null
        setDemoProduct(demo)
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!product) return
    const p = product as any
    const taxonomyCat = p.categories?.find((c: any) => c.metadata?.is_taxonomy === true)
    if (!taxonomyCat) return
    fetchLeafSchema(taxonomyCat.handle)
      .then(setSchema)
      .catch(() => {})
  }, [product])

  const onAdd = () => {
    setAdding(true)

    if (demoProduct) {
      const shop = { slug: demoProduct.shopSlug, name: demoProduct.shopName, currency: demoProduct.currency }
      const item = {
        product_id: demoProduct.id,
        variant_id: `${demoProduct.id}-v1`,
        product_handle: id ?? demoProduct.id,
        title: demoProduct.title,
        thumbnail: demoProduct.images[0] ?? null,
        unit_price_minor: demoProduct.price_minor,
        currency_code: demoProduct.currency,
      }
      for (let i = 0; i < quantity; i++) addItem(shop, item)
      setAdding(false)
      router.push('/(tabs)/cart')
      return
    }

    if (!product) { setAdding(false); return }
    const variant = product.variants?.[0]
    if (!variant) { setAdding(false); return }

    const price = variant?.calculated_price?.calculated_amount
    const currency = variant?.calculated_price?.currency_code ?? 'USD'
    const resolvedShop = {
      slug: (product as any)?.store?.handle ?? 'unknown',
      name: (product as any)?.store?.name ?? 'Shop',
      currency: (currency?.toLowerCase() as 'iqd' | 'usd') ?? 'iqd',
    }
    const cartItem = {
      product_id: product.id,
      variant_id: variant.id,
      product_handle: product.handle ?? product.id,
      title: product.title,
      thumbnail: product.thumbnail ?? null,
      unit_price_minor: price ?? 0,
      currency_code: (currency?.toLowerCase() as 'iqd' | 'usd') ?? 'iqd',
    }

    if (product.thumbnail) {
      fly({
        sourceRef: imgRef,
        shop: resolvedShop,
        item: cartItem,
        onCrossShopNeeded: () => {},
      })
      setAdding(false)
      setTimeout(() => router.push('/(tabs)/cart'), 450)
    } else {
      try {
        const result = addItem(resolvedShop, cartItem)
        if (result === 'added') router.push('/(tabs)/cart')
      } finally {
        setAdding(false)
      }
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={tokens.colors.primary} />
      </SafeAreaView>
    )
  }

  // Resolved display values
  const displayImages: string[] = demoProduct
    ? demoProduct.images
    : product?.thumbnail ? [product.thumbnail] : []
  const displayTitle = demoProduct ? demoProduct.title : (product?.title ?? '')
  const displayDescription = demoProduct ? demoProduct.description : (product?.description ?? null)
  const displayPrice = demoProduct
    ? demoProduct.price_minor
    : (product?.variants?.[0]?.calculated_price?.calculated_amount ?? null)
  const displayCurrency = demoProduct
    ? demoProduct.currency.toUpperCase()
    : (product?.variants?.[0]?.calculated_price?.currency_code ?? 'USD')
  const displayShopName = demoProduct ? demoProduct.shopName : ((product as any)?.store?.name ?? null)
  const displayShopLogo = demoProduct ? demoProduct.shopLogoUrl : null
  const displayShopSlug = demoProduct ? demoProduct.shopSlug : ((product as any)?.store?.handle ?? null)

  return (
    <View style={styles.flex}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {/* Image carousel */}
        <View ref={imgRef}>
          <ImageCarousel images={displayImages} />
        </View>

        {/* Back button overlay */}
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { top: insets.top + tokens.spacing.sm }]}
        >
          <Text style={styles.backBtnText}>‹</Text>
        </Pressable>

        {/* Product header */}
        <View style={styles.headerSection}>
          {displayShopName && (
            <ShopBadge
              name={displayShopName}
              logoUrl={displayShopLogo ?? undefined}
              onShopPress={() => displayShopSlug && router.push(`/shops/${displayShopSlug}`)}
            />
          )}
          <Text style={styles.title}>{displayTitle}</Text>
          {displayPrice != null && (
            <PriceText amount={displayPrice} currencyCode={displayCurrency} />
          )}
          <Pressable
            onPress={() => product && router.push(`/reviews/${product.id}`)}
            style={styles.ratingRow}
          >
            <Text style={styles.ratingText}>⭐ 4.8 · 120 reviews ›</Text>
          </Pressable>
        </View>

        {/* Description */}
        {displayDescription ? (
          <View style={styles.section}>
            <Text style={styles.description}>{displayDescription}</Text>
          </View>
        ) : null}

        {/* DetailsPanel — schema-driven (only when real schema available) */}
        {schema && product && (
          <View style={styles.section}>
            <DetailsPanel
              schema={schema}
              coreFields={((product as any).metadata?.core_fields as Record<string, unknown>) ?? {}}
              customFields={((product as any).metadata?.custom_fields as Record<string, unknown>) ?? {}}
            />
          </View>
        )}
      </ScrollView>

      {/* Sticky add-to-cart bar */}
      <StickyAddToCart
        quantity={quantity}
        setQuantity={setQuantity}
        price={displayPrice ?? 0}
        currencyCode={displayCurrency}
        onAdd={onAdd}
        disabled={adding || displayPrice == null}
      />

      <CartFab itemCount={itemCount} onPress={() => router.push('/(tabs)/cart')} />
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: tokens.colors.bg },
  center: { flex: 1, backgroundColor: tokens.colors.bg, justifyContent: 'center', alignItems: 'center' },
  backBtn: {
    position: 'absolute',
    left: tokens.spacing.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  backBtnText: {
    fontSize: 22,
    color: tokens.colors.white,
    lineHeight: 28,
    marginLeft: -2,
  },
  headerSection: {
    padding: tokens.spacing.lg,
    gap: tokens.spacing.sm,
  },
  title: {
    fontSize: tokens.fontSize.xl,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  ratingRow: {
    marginTop: tokens.spacing.xs,
  },
  ratingText: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textMuted,
  },
  section: {
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.md,
  },
  description: {
    fontSize: tokens.fontSize.base,
    color: tokens.colors.textMuted,
    lineHeight: 22,
  },
})
