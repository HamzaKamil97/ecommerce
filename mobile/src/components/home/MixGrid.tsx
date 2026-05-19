import React from 'react'
import { View, Text, Image, Pressable, StyleSheet, Dimensions } from 'react-native'
import { tokens } from '@/src/theme/tokens'
import { PromotedPill } from './PromotedPill'
import type { GridItem } from '@/src/types/homeLayout'

interface Props {
  items: GridItem[]
  onPressItem: (item: GridItem) => void
  onAddProduct?: (productId: string) => void
}

function formatPrice(price: number, currency: 'iqd' | 'usd'): string {
  if (currency === 'iqd') return `${price.toLocaleString('en-US')} IQD`
  return `$${price.toFixed(2)}`
}

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const GUTTER = tokens.spacing.md
const SIDE_PADDING = tokens.spacing.lg
const CELL_WIDTH = (SCREEN_WIDTH - SIDE_PADDING * 2 - GUTTER) / 2

export function MixGrid({ items, onPressItem }: Props) {
  return (
    <View style={styles.grid}>
      {items.map((item) => {
        const key = item.kind === 'shop' ? `s-${item.slug}` : `p-${item.id}`
        const image = item.kind === 'shop' ? item.coverUrl ?? item.logoUrl : item.thumbnail
        return (
          <Pressable
            key={key}
            style={[styles.cell, { width: CELL_WIDTH }]}
            onPress={() => onPressItem(item)}
          >
            <View style={styles.imageWrap}>
              <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
              {item.sponsored ? (
                <View style={styles.pillWrap}>
                  <PromotedPill size="sm" />
                </View>
              ) : null}
              {item.kind === 'shop' ? (
                <View style={styles.shopLogoOverlay}>
                  <Image source={{ uri: item.logoUrl }} style={styles.shopLogoSmall} />
                </View>
              ) : null}
            </View>
            <View style={styles.body}>
              <Text style={styles.title} numberOfLines={1}>
                {item.kind === 'shop' ? item.name : item.title}
              </Text>
              {item.kind === 'product' ? (
                <Text style={styles.price}>
                  {formatPrice(item.priceMinor, item.currency)}
                </Text>
              ) : (
                <Text style={styles.subtitle} numberOfLines={1}>
                  Shop
                </Text>
              )}
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SIDE_PADDING,
    gap: GUTTER,
    paddingBottom: tokens.spacing.sm,
  },
  cell: {
    backgroundColor: tokens.colors.bg,
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: tokens.colors.border,
    ...tokens.shadow.card,
  },
  imageWrap: {
    height: 120,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  pillWrap: {
    position: 'absolute',
    top: tokens.spacing.sm,
    left: tokens.spacing.sm,
  },
  shopLogoOverlay: {
    position: 'absolute',
    bottom: -16,
    left: tokens.spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.colors.white,
    padding: 2,
    ...tokens.shadow.card,
  },
  shopLogoSmall: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  body: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
    gap: tokens.spacing.xs,
  },
  title: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  subtitle: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textMuted,
  },
  price: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.extrabold,
    color: tokens.colors.text,
  },
})
