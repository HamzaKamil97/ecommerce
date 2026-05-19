import React from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native'
import { tokens } from '@/src/theme/tokens'

export interface Promo {
  id: string
  title: string
  subtitle: string
  discountLabel: string
  iconUrl?: string
  bg: 'teal' | 'saffron' | 'red' | 'navy'
  onPress: () => void
}

interface Props {
  promos: Promo[]
}

const BG_COLORS: Record<Promo['bg'], string> = {
  teal: tokens.colors.primary,
  saffron: tokens.colors.accent,
  red: '#DC2626',
  navy: '#1E3A8A',
}

export function PromoCarousel({ promos }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {promos.map((promo) => (
        <Pressable
          key={promo.id}
          onPress={promo.onPress}
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: BG_COLORS[promo.bg], opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={styles.discountLabel}>{promo.discountLabel}</Text>
          <View style={styles.bottom}>
            <Text style={styles.title} numberOfLines={1}>{promo.title}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>{promo.subtitle}</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: tokens.spacing.lg,
    gap: tokens.spacing.md,
    paddingBottom: tokens.spacing.sm,
  },
  card: {
    width: 240,
    height: 110,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    justifyContent: 'space-between',
    ...tokens.shadow.card,
  },
  discountLabel: {
    alignSelf: 'flex-end',
    fontSize: tokens.fontSize.xxl,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.white,
  },
  bottom: {
    gap: 2,
  },
  title: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.white,
  },
  subtitle: {
    fontSize: tokens.fontSize.sm,
    color: 'rgba(255,255,255,0.82)',
  },
})
