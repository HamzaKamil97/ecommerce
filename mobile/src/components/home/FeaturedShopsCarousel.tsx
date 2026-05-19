import React from 'react'
import { View, Text, ScrollView, Image, Pressable, StyleSheet } from 'react-native'
import { tokens } from '@/src/theme/tokens'
import { SectionHeader } from './SectionHeader'

export interface FeaturedShop {
  slug: string
  name: string
  coverUrl: string
  logoUrl: string
  rating: number
  ratingCount: number
  vertical: string
  deliveryMinutes: number
  minOrder: string
}

interface Props {
  shops: FeaturedShop[]
  onSelect: (shop: FeaturedShop) => void
  onSeeAll?: () => void
}

export function FeaturedShopsCarousel({ shops, onSelect, onSeeAll }: Props) {
  return (
    <View>
      <SectionHeader title="Featured shops" actionLabel="See all" onAction={onSeeAll} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {shops.map((shop) => (
          <Pressable key={shop.slug} style={styles.card} onPress={() => onSelect(shop)}>
            <View style={styles.coverWrapper}>
              <Image source={{ uri: shop.coverUrl }} style={styles.cover} resizeMode="cover" />
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>⭐ {shop.rating.toFixed(1)}</Text>
              </View>
              {shop.deliveryMinutes <= 30 && (
                <View style={styles.expressBadge}>
                  <Text style={styles.expressText}>⚡ Express</Text>
                </View>
              )}
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.shopName} numberOfLines={1}>{shop.name}</Text>
              <View style={styles.pillRow}>
                <View style={styles.verticalPill}>
                  <Text style={styles.verticalText}>{shop.vertical}</Text>
                </View>
              </View>
              <Text style={styles.meta}>
                {shop.deliveryMinutes}–{shop.deliveryMinutes + 10} min · Min {shop.minOrder}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.sm,
    gap: tokens.spacing.md,
  },
  card: {
    width: 280,
    backgroundColor: tokens.colors.bg,
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: tokens.colors.border,
    ...tokens.shadow.card,
  },
  coverWrapper: {
    height: 100,
    position: 'relative',
  },
  cover: {
    width: '100%',
    height: 100,
  },
  ratingBadge: {
    position: 'absolute',
    top: tokens.spacing.sm,
    right: tokens.spacing.sm,
    backgroundColor: tokens.colors.white,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 3,
  },
  ratingText: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.text,
  },
  expressBadge: {
    position: 'absolute',
    top: tokens.spacing.sm,
    left: tokens.spacing.sm,
    backgroundColor: tokens.colors.accent,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 3,
  },
  expressText: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.white,
  },
  cardBody: {
    padding: tokens.spacing.md,
    gap: tokens.spacing.xs,
  },
  shopName: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  pillRow: {
    flexDirection: 'row',
  },
  verticalPill: {
    backgroundColor: tokens.colors.accent + '22',
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
  },
  verticalText: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.accentDark,
  },
  meta: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textMuted,
  },
})
