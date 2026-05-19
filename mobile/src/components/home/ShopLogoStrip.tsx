import React from 'react'
import { View, Text, Image, Pressable, ScrollView, StyleSheet } from 'react-native'
import { tokens } from '@/src/theme/tokens'
import { PromotedPill } from './PromotedPill'

export interface ShopLogoItem {
  slug: string
  name: string
  logoUrl: string
  sponsored?: boolean
}

interface Props {
  shops: ShopLogoItem[]
  onPress: (slug: string) => void
}

export function ShopLogoStrip({ shops, onPress }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {shops.map((shop) => (
        <Pressable
          key={shop.slug}
          style={styles.item}
          onPress={() => onPress(shop.slug)}
        >
          <View style={styles.logoWrap}>
            <Image source={{ uri: shop.logoUrl }} style={styles.logo} resizeMode="cover" />
            {shop.sponsored ? (
              <View style={styles.pillWrap}>
                <PromotedPill size="sm" />
              </View>
            ) : null}
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {shop.name}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}

const LOGO_SIZE = 68

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.sm,
    gap: tokens.spacing.md,
  },
  item: {
    width: 78,
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  logoWrap: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    position: 'relative',
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  pillWrap: {
    position: 'absolute',
    bottom: 2,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  name: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.text,
    textAlign: 'center',
    maxWidth: 78,
  },
})
