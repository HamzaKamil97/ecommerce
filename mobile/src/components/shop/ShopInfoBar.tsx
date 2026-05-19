import React from 'react'
import { View, Text, Image, StyleSheet } from 'react-native'
import { tokens } from '@/src/theme/tokens'
import { t } from '@/src/i18n'

interface ShopMeta {
  name: string
  logoUrl: string
  vertical: string
  rating: number
  ratingCount: number
  deliveryMinutes: string   // e.g. "25–35"
  minOrder: string           // e.g. "5,000 IQD"
  deliveryFee?: string       // "Free" or amount
  isOpen: boolean
}

interface Props {
  shop: ShopMeta
}

function isExpress(deliveryMinutes: string): boolean {
  // Parse the max end of range, e.g. "25–35" → 35
  const parts = deliveryMinutes.split(/[–\-]/)
  const max = parseInt(parts[parts.length - 1]?.trim() ?? '999', 10)
  return max <= 30
}

export function ShopInfoBar({ shop }: Props) {
  const express = isExpress(shop.deliveryMinutes)

  return (
    <View style={styles.card}>
      {/* Logo + name row */}
      <View style={styles.headerRow}>
        <View style={styles.logoWrap}>
          {shop.logoUrl ? (
            <Image source={{ uri: shop.logoUrl }} style={styles.logo} />
          ) : (
            <View style={[styles.logo, styles.logoFallback]}>
              <Text style={styles.logoEmoji}>🏪</Text>
            </View>
          )}
        </View>

        <View style={styles.nameCol}>
          <Text style={styles.shopName} numberOfLines={1}>{shop.name}</Text>

          {/* Pill row */}
          <View style={styles.pillRow}>
            <View style={styles.pillVertical}>
              <Text style={styles.pillVerticalText}>{shop.vertical}</Text>
            </View>
            <View style={[styles.pill, shop.isOpen ? styles.pillOpen : styles.pillClosed]}>
              <Text style={[styles.pillText, shop.isOpen ? styles.pillOpenText : styles.pillClosedText]}>
                {shop.isOpen ? t('shop.open') : t('shop.closed')}
              </Text>
            </View>
            {express && (
              <View style={styles.pillExpress}>
                <Text style={styles.pillExpressText}>⚡ Express</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <Text style={styles.stat}>⭐ {shop.rating} ({shop.ratingCount})</Text>
        <Text style={styles.dot}>·</Text>
        <Text style={styles.stat}>🕒 {shop.deliveryMinutes} min</Text>
        <Text style={styles.dot}>·</Text>
        <Text style={styles.stat}>💰 Min {shop.minOrder}</Text>
        {shop.deliveryFee && (
          <>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.stat}>
              🚚 {shop.deliveryFee === 'Free' ? 'Free delivery' : shop.deliveryFee}
            </Text>
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginTop: -32,
    marginHorizontal: tokens.spacing.lg,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.bg,
    padding: tokens.spacing.lg,
    ...tokens.shadow.card,
    shadowOpacity: 0.1,
    elevation: 4,
    gap: tokens.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
  },
  logoWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: tokens.colors.border,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  logoFallback: {
    backgroundColor: tokens.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: { fontSize: 28 },
  nameCol: { flex: 1, gap: tokens.spacing.xs },
  shopName: {
    fontSize: tokens.fontSize.xl,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.xs,
    marginTop: 2,
  },
  pill: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 3,
    borderRadius: tokens.radius.pill,
  },
  pillText: { fontSize: tokens.fontSize.xs, fontWeight: tokens.fontWeight.semibold },
  pillVertical: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 3,
    borderRadius: tokens.radius.pill,
  },
  pillVerticalText: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.semibold,
    color: '#92400E',
  },
  pillOpen: { backgroundColor: '#DCFCE7' },
  pillOpenText: { color: '#166534' },
  pillClosed: { backgroundColor: '#FEE2E2' },
  pillClosedText: { color: '#991B1B' },
  pillExpress: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 3,
    borderRadius: tokens.radius.pill,
  },
  pillExpressText: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.primaryDark,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  stat: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textMuted,
    fontWeight: tokens.fontWeight.medium,
  },
  dot: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textSubtle,
  },
})
