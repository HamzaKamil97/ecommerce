import React from 'react'
import { View, Text, Image, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { tokens } from '@/src/theme/tokens'

export interface ShopRowData {
  slug: string
  name: string
  logoUrl: string
  vertical: string
  rating: number
  deliveryMinutes: number
  minOrder: string
  isOpen: boolean
}

interface Props {
  shop: ShopRowData
  onPress: () => void
}

export function ShopRow({ shop, onPress }: Props) {
  const isExpress = shop.deliveryMinutes <= 30

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Image source={{ uri: shop.logoUrl }} style={styles.logo} resizeMode="cover" />
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{shop.name}</Text>
          {isExpress && <Text style={styles.expressIcon}>⚡</Text>}
        </View>
        <View style={styles.pillRow}>
          <View style={styles.verticalPill}>
            <Text style={styles.verticalText}>{shop.vertical}</Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="star" size={12} color={tokens.colors.accent} />
          <Text style={styles.meta}>
            {' '}{shop.rating.toFixed(1)} · {shop.deliveryMinutes}–{shop.deliveryMinutes + 10} min · Min {shop.minOrder}
          </Text>
        </View>
      </View>
      <View style={styles.right}>
        <View style={[styles.statusBadge, shop.isOpen ? styles.openBadge : styles.closedBadge]}>
          <View style={[styles.statusDot, { backgroundColor: shop.isOpen ? tokens.colors.success : tokens.colors.danger }]} />
          <Text style={[styles.statusText, shop.isOpen ? styles.openText : styles.closedText]}>
            {shop.isOpen ? 'OPEN' : 'CLOSED'}
          </Text>
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    height: 96,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.bg,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
    gap: tokens.spacing.md,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.surface,
  },
  info: {
    flex: 1,
    gap: tokens.spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  name: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
    flex: 1,
  },
  expressIcon: {
    fontSize: 14,
  },
  pillRow: {
    flexDirection: 'row',
  },
  verticalPill: {
    backgroundColor: tokens.colors.surfaceAlt,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
  },
  verticalText: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  meta: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textMuted,
  },
  right: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 72,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
  },
  openBadge: { backgroundColor: tokens.colors.success + '22' },
  closedBadge: { backgroundColor: tokens.colors.danger + '18' },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: 0.4,
  },
  openText: { color: tokens.colors.success },
  closedText: { color: tokens.colors.danger },
})
