import React, { useCallback } from 'react'
import { View, Text, Image, Pressable, ScrollView, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { tokens } from '@/src/theme/tokens'
import { t } from '@/src/i18n'
import { useLanguageStore } from '@/src/store/languageStore'
import { useCartStore } from '@/src/store/cartStore'
import { DEMO_FOR_YOU, type ForYouRecommendation } from '@/src/data/demoForYou'

function formatPrice(price: number, currency: 'iqd' | 'usd'): string {
  if (currency === 'iqd') return `${price.toLocaleString('en-US')} IQD`
  return `$${price.toFixed(2)}`
}

export function ForYouCarousel() {
  useLanguageStore((s) => s.locale)
  const router = useRouter()
  const addItem = useCartStore((s) => s.addItem)

  const onAdd = useCallback(
    (rec: ForYouRecommendation) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      addItem(
        { slug: rec.shopSlug, name: rec.shopName, currency: rec.currency },
        {
          product_id: rec.productId,
          variant_id: `${rec.productId}-default`,
          product_handle: rec.productId,
          title: rec.productName,
          thumbnail: rec.imageUrl,
          unit_price_minor: rec.price,
          currency_code: rec.currency,
        },
      )
    },
    [addItem],
  )

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {DEMO_FOR_YOU.map((rec) => {
        const reason =
          rec.reason.kind === 'because_ordered'
            ? t('forYou.reason.becauseYou', { shop: rec.reason.arg })
            : t('forYou.reason.trendingIn', { vertical: rec.reason.arg })

        return (
          <Pressable
            key={rec.id}
            style={styles.card}
            onPress={() => router.push(`/products/${rec.productId}` as never)}
          >
            <View style={styles.imageWrap}>
              <Image source={{ uri: rec.imageUrl }} style={styles.image} resizeMode="cover" />
              <View style={styles.shopPill}>
                <Image source={{ uri: rec.shopLogoUrl }} style={styles.shopLogo} />
                <Text style={styles.shopName} numberOfLines={1}>{rec.shopName}</Text>
              </View>
              <View style={styles.fyBadge}>
                <Text style={styles.fyBadgeText}>✨ {t('forYou.badge')}</Text>
              </View>
            </View>
            <View style={styles.body}>
              <Text style={styles.productName} numberOfLines={1}>{rec.productName}</Text>
              <Text style={styles.reason} numberOfLines={2}>{reason}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.price}>{formatPrice(rec.price, rec.currency)}</Text>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation()
                    onAdd(rec)
                  }}
                  style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
                  hitSlop={6}
                >
                  <Text style={styles.addBtnText}>{t('forYou.add')}</Text>
                </Pressable>
              </View>
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
    width: 200,
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
  shopPill: {
    position: 'absolute',
    top: tokens.spacing.sm,
    left: tokens.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 4,
    maxWidth: 130,
  },
  shopLogo: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  shopName: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.white,
    flexShrink: 1,
  },
  fyBadge: {
    position: 'absolute',
    top: tokens.spacing.sm,
    right: tokens.spacing.sm,
    backgroundColor: tokens.colors.accent,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 3,
  },
  fyBadgeText: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.white,
  },
  body: {
    padding: tokens.spacing.md,
    gap: tokens.spacing.xs,
  },
  productName: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  reason: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textMuted,
    minHeight: 28,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: tokens.spacing.xs,
  },
  price: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.extrabold,
    color: tokens.colors.text,
  },
  addBtn: {
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 6,
  },
  addBtnPressed: {
    opacity: 0.85,
  },
  addBtnText: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.white,
  },
})
