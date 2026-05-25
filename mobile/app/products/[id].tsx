import { useEffect, useState, useRef } from 'react'
import { ScrollView, View, Text, ActivityIndicator, SafeAreaView, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getProduct, getProductVerticalFields, VerticalFields } from '@/src/api/products'
import { Product } from '@/src/types/product'
import { useCartStore } from '@/src/store/cartStore'
import { DetailsPanel } from '@/src/components/DetailsPanel'
import { PriceText } from '@/src/components/PriceText'
import { fetchLeafSchema } from '@/src/lib/api/taxonomy'
import type { LeafSchema } from '@/src/lib/api/types'
import { useFlyToCart } from '@/src/hooks/useFlyToCart'
import { tokens } from '@/src/theme/tokens'
import { ImageCarousel } from '@/src/components/product/ImageCarousel'
import { ShopBadge } from '@/src/components/product/ShopBadge'
import { StickyAddToCart } from '@/src/components/product/StickyAddToCart'
import { DEMO_PRODUCTS, DEMO_PRODUCTS_BY_SHOP } from '@/src/components/home/demo-data'
import { showToast } from '@/src/components/Toast'
import { useChromeStore } from '@/src/store/chromeStore'
import { t } from '@/src/i18n'
import { AddToCartSheet } from '@/src/components/cart/AddToCartSheet'
import { selectedLabels, type SelectedOptions, type ProductOption } from '@/src/types/productOptions'

export default function ProductDetailsScreen() {
  useEffect(() => {
    useChromeStore.getState().setNajmaFabHidden(true)
    return () => useChromeStore.getState().setNajmaFabHidden(false)
  }, [])

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
  const [sheetOpen, setSheetOpen] = useState(false)

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
        const demo = DEMO_PRODUCTS[id] ?? null
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

  const returnAfterAdd = (shopSlug: string | null) => {
    showToast({ message: t('product.addedToCart') })
    if (router.canGoBack()) router.back()
    else if (shopSlug) router.replace(`/shops/${shopSlug}` as never)
    else router.replace('/(tabs)/' as never)
  }

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
      returnAfterAdd(demoProduct.shopSlug)
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
      setTimeout(() => returnAfterAdd(resolvedShop.slug), 450)
    } else {
      try {
        const result = addItem(resolvedShop, cartItem)
        if (result === 'added') returnAfterAdd(resolvedShop.slug)
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

  // Resolve options for the demo product via DEMO_PRODUCTS_BY_SHOP lookup.
  let displayOptions: ProductOption[] | undefined
  if (demoProduct && id) {
    const inShop = DEMO_PRODUCTS_BY_SHOP[demoProduct.shopSlug]?.find((p) => p.id === id)
    displayOptions = inShop?.options
  }
  const hasOptions = (displayOptions?.length ?? 0) > 0

  function handleSheetConfirm(params: {
    quantity: number
    notes: string
    selected: SelectedOptions
    lineTotalMinor: number
  }) {
    if (!demoProduct) return
    const labels = displayOptions ? selectedLabels(displayOptions, params.selected) : []
    const labelSuffix = labels.length > 0 ? ` · ${labels.join(', ')}` : ''
    const variantKeyParts = Object.entries(params.selected)
      .map(([k, v]) => `${k}:${[...v].sort().join('+')}`)
      .sort()
      .join('|')
    const variantId = variantKeyParts
      ? `${demoProduct.id}-v1-${variantKeyParts}`
      : `${demoProduct.id}-v1`
    const unitPriceMinor = Math.round(params.lineTotalMinor / Math.max(1, params.quantity))
    const shop = { slug: demoProduct.shopSlug, name: demoProduct.shopName, currency: demoProduct.currency }
    const item = {
      product_id: demoProduct.id,
      variant_id: variantId,
      product_handle: id ?? demoProduct.id,
      title: `${demoProduct.title}${labelSuffix}`,
      thumbnail: demoProduct.images[0] ?? null,
      unit_price_minor: unitPriceMinor,
      currency_code: demoProduct.currency,
      metadata: {
        notes: params.notes || undefined,
        selected_options: params.selected,
        option_labels: labels,
      },
    }
    for (let i = 0; i < params.quantity; i++) addItem(shop, item)
    returnAfterAdd(demoProduct.shopSlug)
  }

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
          accessibilityLabel={t('common.close')}
        >
          <Ionicons name="arrow-back" size={22} color={tokens.colors.white} />
        </Pressable>

        {/* Send as gift overlay */}
        <Pressable
          onPress={() => router.push('/gift-occasions' as never)}
          style={[styles.giftHeaderBtn, { top: insets.top + tokens.spacing.sm }]}
          accessibilityLabel={t('product.sendAsGift')}
          hitSlop={6}
        >
          <Ionicons name="gift-outline" size={20} color={tokens.colors.white} />
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="star" size={14} color={tokens.colors.accent} />
              <Text style={styles.ratingText}>4.8 · {t('product.reviews', { count: 120 })} ›</Text>
            </View>
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

        <View style={styles.section}>
          <Pressable
            onPress={() => router.push('/gift-occasions' as never)}
            style={({ pressed }) => [styles.sendAsGiftBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="gift-outline" size={18} color={tokens.colors.primary} />
            <Text style={styles.sendAsGiftText}>{t('product.sendAsGift')}</Text>
          </Pressable>
        </View>
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
  giftHeaderBtn: {
    position: 'absolute',
    right: tokens.spacing.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
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
  sendAsGiftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.xs,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
  },
  sendAsGiftText: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.primary,
  },
})
