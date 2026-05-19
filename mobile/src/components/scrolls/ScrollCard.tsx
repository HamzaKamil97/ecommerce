import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Dimensions,
  Share,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { tokens } from '@/src/theme/tokens'
import { t } from '@/src/i18n'
import { useLanguageStore } from '@/src/store/languageStore'
import { useCartStore } from '@/src/store/cartStore'
import type { ScrollItem } from '@/src/data/demoScrolls'
import { ScrollRailAction } from './ScrollRailAction'

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window')

interface Props {
  scroll: ScrollItem
}

function formatPrice(price: number, currency: 'iqd' | 'usd'): string {
  if (currency === 'iqd') return `${price.toLocaleString('en-US')} IQD`
  return `$${price.toFixed(2)}`
}

export function ScrollCard({ scroll }: Props) {
  useLanguageStore((s) => s.locale)
  const router = useRouter()
  const addItem = useCartStore((s) => s.addItem)

  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const [addedFlash, setAddedFlash] = useState(false)

  const onLike = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    setLiked((v) => !v)
  }, [])

  const onSave = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    setSaved((v) => !v)
  }, [])

  const onShare = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    Share.share({
      message: `${scroll.productName} — ${scroll.shopName} on Hanoot`,
      url: `hanoot://shops/${scroll.shopSlug}`,
    }).catch(() => {})
  }, [scroll])

  const onAdd = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    addItem(
      { slug: scroll.shopSlug, name: scroll.shopName, currency: scroll.currency },
      {
        product_id: scroll.productId,
        variant_id: `${scroll.productId}-default`,
        product_handle: scroll.productId,
        title: scroll.productName,
        thumbnail: scroll.imageUrl,
        unit_price_minor: scroll.price,
        currency_code: scroll.currency,
      },
    )
    setAddedFlash(true)
    setTimeout(() => setAddedFlash(false), 1500)
  }, [addItem, scroll])

  const onOpenProduct = useCallback(() => {
    router.push(`/products/${scroll.productId}` as never)
  }, [router, scroll.productId])

  const priceLabel = formatPrice(scroll.price, scroll.currency)

  return (
    <View style={styles.container}>
      <Pressable style={styles.imagePress} onPress={onOpenProduct}>
        <Image source={{ uri: scroll.imageUrl }} style={styles.image} resizeMode="cover" />
        <View style={styles.topGradient} />
        <View style={styles.bottomGradient} />
      </Pressable>

      <View style={styles.topRow} pointerEvents="box-none">
        <View style={styles.shopBadge}>
          <Image source={{ uri: scroll.shopLogoUrl }} style={styles.shopLogo} />
          <Text style={styles.shopName} numberOfLines={1}>{scroll.shopName}</Text>
        </View>
        <View style={styles.verticalPill}>
          <Text style={styles.verticalText}>{scroll.vertical}</Text>
        </View>
      </View>

      <View style={styles.rightRail} pointerEvents="box-none">
        <ScrollRailAction
          icon={liked ? '❤️' : '🤍'}
          label={t('scrolls.like')}
          subLabel={scroll.likes}
          onPress={onLike}
          active={liked}
        />
        <ScrollRailAction
          icon={saved ? '🔖' : '📑'}
          label={t('scrolls.save')}
          onPress={onSave}
          active={saved}
        />
        <ScrollRailAction icon="↗" label={t('scrolls.share')} onPress={onShare} />
      </View>

      <View style={styles.bottomBlock} pointerEvents="box-none">
        <Text style={styles.productName} numberOfLines={1}>{scroll.productName}</Text>
        <Text style={styles.caption} numberOfLines={2}>{scroll.caption}</Text>
        <Pressable style={styles.addPill} onPress={onAdd}>
          <Text style={styles.addPillText}>{t('scrolls.add', { price: priceLabel })}</Text>
        </Pressable>
      </View>

      {addedFlash && (
        <View style={styles.addedFlash} pointerEvents="none">
          <Text style={styles.addedFlashText}>{t('scrolls.added')}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    height: SCREEN_HEIGHT,
    width: SCREEN_WIDTH,
    backgroundColor: '#000',
    position: 'relative',
  },
  imagePress: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 260,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  topRow: {
    position: 'absolute',
    top: 60,
    left: tokens.spacing.lg,
    right: tokens.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacing.sm,
  },
  shopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 4,
    gap: tokens.spacing.sm,
    maxWidth: '70%',
  },
  shopLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: tokens.colors.surface,
  },
  shopName: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.white,
    flexShrink: 1,
  },
  verticalPill: {
    backgroundColor: tokens.colors.accent,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 4,
  },
  verticalText: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.white,
  },
  rightRail: {
    position: 'absolute',
    right: tokens.spacing.md,
    bottom: 200,
    alignItems: 'center',
    gap: tokens.spacing.lg,
  },
  bottomBlock: {
    position: 'absolute',
    left: tokens.spacing.lg,
    right: 80,
    bottom: 110,
    gap: tokens.spacing.sm,
  },
  productName: {
    fontSize: tokens.fontSize.xl,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.white,
  },
  caption: {
    fontSize: tokens.fontSize.base,
    color: tokens.colors.white,
    opacity: 0.92,
    lineHeight: 19,
  },
  addPill: {
    marginTop: tokens.spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
  },
  addPillText: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.white,
  },
  addedFlash: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
    backgroundColor: 'rgba(15,118,110,0.95)',
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.pill,
  },
  addedFlashText: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.white,
  },
})
