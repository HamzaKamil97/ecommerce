import React from 'react'
import { View, Text, ScrollView, Image, Pressable, StyleSheet } from 'react-native'
import { tokens } from '@/src/theme/tokens'

export interface ActiveBasket {
  id: string
  shopSlug: string
  shopName: string
  shopLogoUrl: string
  itemCount: number
  totalFormatted: string
}

interface Props {
  baskets: ActiveBasket[]
  onResume: (basket: ActiveBasket) => void
}

export function ActiveBasketsCarousel({ baskets, onResume }: Props) {
  if (baskets.length === 0) return null

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {baskets.map((basket) => (
        <Pressable key={basket.id} style={styles.card} onPress={() => onResume(basket)}>
          <Image source={{ uri: basket.shopLogoUrl }} style={styles.logo} resizeMode="cover" />
          <View style={styles.info}>
            <Text style={styles.shopName} numberOfLines={1}>{basket.shopName}</Text>
            <Text style={styles.meta}>
              {basket.itemCount} {basket.itemCount === 1 ? 'item' : 'items'} · {basket.totalFormatted}
            </Text>
          </View>
          <View style={styles.resumeBtn}>
            <Text style={styles.resumeText}>Continue</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.sm,
    gap: tokens.spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.bg,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
    gap: tokens.spacing.md,
    width: 300,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    ...tokens.shadow.card,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.sm,
    backgroundColor: tokens.colors.surface,
  },
  info: {
    flex: 1,
    gap: tokens.spacing.xs,
  },
  shopName: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.text,
  },
  meta: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textMuted,
  },
  resumeBtn: {
    backgroundColor: tokens.colors.primary,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.pill,
  },
  resumeText: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.white,
  },
})
