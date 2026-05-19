import React from 'react'
import { View, Text, Image, Pressable, ScrollView, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { tokens } from '@/src/theme/tokens'
import { useCartStore } from '@/src/store/cartStore'
import { QuantityStepper } from '@/src/components/QuantityStepper'
import { PromotedPill } from './PromotedPill'

export interface ProductCardItem {
  id: string
  title: string
  thumbnail: string
  priceMinor: number
  currency: 'iqd' | 'usd'
  shopSlug: string
  shopName: string
  shopLogoUrl?: string
  sponsored?: boolean
}

interface Props {
  products: ProductCardItem[]
  onPress: (productId: string) => void
}

function formatPrice(price: number, currency: 'iqd' | 'usd'): string {
  if (currency === 'iqd') return `${price.toLocaleString('en-US')} IQD`
  return `$${price.toFixed(2)}`
}

export function ProductCardRow({ products, onPress }: Props) {
  const addItem = useCartStore((s) => s.addItem)
  const incQty = useCartStore((s) => s.incQty)
  const decQty = useCartStore((s) => s.decQty)
  const cartItems = useCartStore((s) => s.items)

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {products.map((p) => {
        const variantId = `${p.id}-default`
        const qty = cartItems.find((ci) => ci.variant_id === variantId)?.qty ?? 0
        return (
          <Pressable key={p.id} style={styles.card} onPress={() => onPress(p.id)}>
            <View style={styles.imageWrap}>
              <Image source={{ uri: p.thumbnail }} style={styles.image} resizeMode="cover" />
              {p.sponsored ? (
                <View style={styles.pillWrap}>
                  <PromotedPill size="sm" />
                </View>
              ) : null}
              {p.shopLogoUrl ? (
                <View style={styles.shopPill}>
                  <Image source={{ uri: p.shopLogoUrl }} style={styles.shopLogo} />
                  <Text style={styles.shopName} numberOfLines={1}>
                    {p.shopName}
                  </Text>
                </View>
              ) : null}
              <View style={styles.stepperWrap}>
                <QuantityStepper
                  qty={qty}
                  onAdd={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
                    addItem(
                      { slug: p.shopSlug, name: p.shopName, currency: p.currency },
                      {
                        product_id: p.id,
                        variant_id: variantId,
                        product_handle: p.id,
                        title: p.title,
                        thumbnail: p.thumbnail,
                        unit_price_minor: p.priceMinor,
                        currency_code: p.currency,
                      },
                    )
                  }}
                  onIncrement={() => incQty(variantId)}
                  onDecrement={() => decQty(variantId)}
                  size="sm"
                />
              </View>
            </View>
            <View style={styles.body}>
              <Text style={styles.title} numberOfLines={1}>
                {p.title}
              </Text>
              <Text style={styles.price}>{formatPrice(p.priceMinor, p.currency)}</Text>
            </View>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.sm,
    gap: tokens.spacing.md,
  },
  card: {
    width: 180,
    backgroundColor: tokens.colors.bg,
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: tokens.colors.border,
    ...tokens.shadow.card,
  },
  imageWrap: {
    height: 130,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 130,
  },
  pillWrap: {
    position: 'absolute',
    top: tokens.spacing.sm,
    left: tokens.spacing.sm,
  },
  shopPill: {
    position: 'absolute',
    bottom: tokens.spacing.sm,
    left: tokens.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 4,
    maxWidth: 120,
  },
  shopLogo: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  shopName: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.white,
    flexShrink: 1,
  },
  stepperWrap: {
    position: 'absolute',
    bottom: tokens.spacing.sm,
    right: tokens.spacing.sm,
  },
  body: {
    padding: tokens.spacing.md,
    gap: tokens.spacing.xs,
  },
  title: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  price: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.extrabold,
    color: tokens.colors.text,
  },
})
