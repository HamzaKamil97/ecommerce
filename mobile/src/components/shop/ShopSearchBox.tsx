import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { tokens } from '@/src/theme/tokens'

interface Props {
  shopName: string
  onPress: () => void
}

export function ShopSearchBox({ shopName, onPress }: Props) {
  return (
    <View style={styles.wrapper}>
      <Pressable onPress={onPress} style={styles.container}>
        <Text style={styles.icon}>🔍</Text>
        <Text style={styles.placeholder} numberOfLines={1}>
          Search in {shopName}
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    backgroundColor: tokens.colors.bg,
  },
  container: {
    height: 44,
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
    gap: tokens.spacing.sm,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  icon: {
    fontSize: 16,
  },
  placeholder: {
    flex: 1,
    fontSize: tokens.fontSize.base,
    color: tokens.colors.textMuted,
  },
})
