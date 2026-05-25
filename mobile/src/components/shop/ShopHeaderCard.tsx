import React from 'react'
import { View, Text, Image, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { tokens } from '@/src/theme/tokens'
import { t } from '@/src/i18n'
import { useLanguageStore } from '@/src/store/languageStore'
import { HanootSelectBadge } from './HanootSelectBadge'

interface Props {
  coverUrl: string
  logoUrl: string
  name: string
  vertical: string
  rating: number
  ratingCount: number
  deliveryMinutes: string
  deliveryFee: string
  minOrder: string
  isOpen?: boolean
  isHanootSelect?: boolean
  onBack?: () => void
  onFavorite?: () => void
  onShare?: () => void
  onMoreInfo?: () => void
}

const COVER_HEIGHT = 200

export function ShopHeaderCard({
  coverUrl,
  logoUrl,
  name,
  vertical,
  rating,
  ratingCount,
  deliveryMinutes,
  deliveryFee,
  minOrder,
  isHanootSelect,
  onBack,
  onFavorite,
  onShare,
  onMoreInfo,
}: Props) {
  useLanguageStore((s) => s.locale)
  const insets = useSafeAreaInsets()
  const topActionsTop = insets.top + tokens.spacing.sm

  const deliveryLabel = t('shop.deliveryMin', { min: deliveryMinutes })
  const isFreeDelivery = /free/i.test(deliveryFee.trim())
  const deliveryFeeLabel = isFreeDelivery
    ? t('shop.freeDelivery')
    : t('shop.deliveryFee', { amount: deliveryFee })
  const minOrderLabel = t('shop.minOrder', { amount: minOrder })
  const reviewsLabel = t('shop.reviewsCount', { count: ratingCount })

  return (
    <View style={styles.wrap}>
      <View style={styles.coverWrap}>
        <Image
          source={{ uri: coverUrl }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
        {/* Fake gradient: two stacked Views (RN-Web compatible) */}
        <View style={styles.gradientTop} />
        <View style={styles.gradientBottom} />

        <View style={[styles.topLeft, { top: topActionsTop }]}>
          <Pressable onPress={onBack} hitSlop={8} accessibilityLabel="Go back" style={styles.circleBtn}>
            <Ionicons name="chevron-back" size={20} color={tokens.colors.text} />
          </Pressable>
        </View>

        <View style={[styles.topRight, { top: topActionsTop }]}>
          <Pressable onPress={onFavorite} hitSlop={8} accessibilityLabel="Favorite" style={styles.circleBtn}>
            <Ionicons name="heart-outline" size={18} color={tokens.colors.text} />
          </Pressable>
          <Pressable onPress={onShare} hitSlop={8} accessibilityLabel="Share" style={styles.circleBtn}>
            <Ionicons name="share-outline" size={18} color={tokens.colors.text} />
          </Pressable>
        </View>
      </View>

      <Pressable
        onPress={onMoreInfo}
        style={styles.card}
        accessibilityRole="button"
        accessibilityLabel="Shop info"
      >
        <View style={styles.topRow}>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={styles.logo} />
          ) : (
            <View style={[styles.logo, styles.logoFallback]}>
              <Text style={styles.logoEmoji}>🏪</Text>
            </View>
          )}
          <View style={styles.nameCol}>
            <View style={styles.nameRow}>
              <Text style={styles.shopName} numberOfLines={1}>{name}</Text>
              {isHanootSelect ? <HanootSelectBadge size="md" /> : null}
            </View>
            {vertical ? <Text style={styles.vertical} numberOfLines={1}>{vertical}</Text> : null}
          </View>
          <Ionicons name="chevron-forward" size={20} color={tokens.colors.textMuted} />
        </View>

        <View style={styles.statsRow}>
          <Ionicons name="star" size={14} color={tokens.colors.accent} />
          <Text style={styles.statStrong}>{rating.toFixed(1)}</Text>
          <Text style={styles.statMuted}>{reviewsLabel}</Text>
          <Text style={styles.dot}>·</Text>
          <Ionicons name="time-outline" size={14} color={tokens.colors.textMuted} />
          <Text style={styles.statMuted}>{deliveryLabel}</Text>
          <Text style={styles.dot}>·</Text>
          <Ionicons
            name={isFreeDelivery ? 'bicycle-outline' : 'cash-outline'}
            size={14}
            color={tokens.colors.textMuted}
          />
          <Text style={styles.statMuted}>{deliveryFeeLabel}</Text>
        </View>

        {minOrder ? (
          <View style={styles.minOrderRow}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>{minOrderLabel}</Text>
            </View>
          </View>
        ) : null}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  coverWrap: {
    height: COVER_HEIGHT,
    width: '100%',
    backgroundColor: tokens.colors.surfaceAlt,
    overflow: 'hidden',
  },
  gradientTop: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: COVER_HEIGHT * 0.6,
    backgroundColor: 'rgba(0,0,0,0)',
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: COVER_HEIGHT * 0.4,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  topLeft: { position: 'absolute', left: tokens.spacing.lg, zIndex: 10 },
  topRight: {
    position: 'absolute',
    right: tokens.spacing.lg,
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    zIndex: 10,
  },
  circleBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center', justifyContent: 'center',
  },
  card: {
    marginTop: -48,
    marginHorizontal: tokens.spacing.lg,
    padding: tokens.spacing.lg,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.bg,
    gap: tokens.spacing.md,
    ...tokens.shadow.card,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
  },
  logo: {
    width: 48, height: 48,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.surface,
  },
  logoFallback: { alignItems: 'center', justifyContent: 'center' },
  logoEmoji: { fontSize: 22 },
  nameCol: { flex: 1, gap: 2 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    flexWrap: 'wrap',
  },
  shopName: {
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  vertical: { fontSize: tokens.fontSize.sm, color: tokens.colors.textMuted },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  statStrong: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.text,
  },
  statMuted: { fontSize: tokens.fontSize.sm, color: tokens.colors.textMuted },
  dot: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textSubtle,
    marginHorizontal: 2,
  },
  minOrderRow: { flexDirection: 'row' },
  chip: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  chipText: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textMuted,
    fontWeight: tokens.fontWeight.medium,
  },
})
