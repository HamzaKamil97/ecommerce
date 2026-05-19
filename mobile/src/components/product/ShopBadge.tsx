import React from 'react'
import { View, Text, Image, Pressable, StyleSheet } from 'react-native'
import { tokens } from '@/src/theme/tokens'

interface Props {
  name: string
  logoUrl?: string
  onShopPress: () => void
}

export function ShopBadge({ name, logoUrl, onShopPress }: Props) {
  return (
    <Pressable
      onPress={onShopPress}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.75 : 1 }]}
    >
      {logoUrl ? (
        <Image source={{ uri: logoUrl }} style={styles.logo} resizeMode="cover" />
      ) : (
        <View style={[styles.logo, styles.logoFallback]}>
          <Text style={styles.logoInitial}>{name.charAt(0)}</Text>
        </View>
      )}
      <Text style={styles.name} numberOfLines={1}>{name}</Text>
      <Text style={styles.arrow}>›</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: tokens.colors.surface,
  },
  logoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colors.primary,
  },
  logoInitial: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.white,
  },
  name: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textMuted,
    flex: 1,
  },
  arrow: {
    fontSize: 16,
    color: tokens.colors.textMuted,
  },
})
