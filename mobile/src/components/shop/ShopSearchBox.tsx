import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { tokens } from '@/src/theme/tokens'
import { t } from '@/src/i18n'

interface Props {
  shopName: string
  onPress: () => void
}

export function ShopSearchBox({ shopName, onPress }: Props) {
  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={onPress}
        hitSlop={8}
        style={({ pressed }) => [styles.container, pressed && { opacity: 0.85 }]}
      >
        <Ionicons name="search" size={18} color={tokens.colors.textMuted} />
        <Text style={styles.placeholder} numberOfLines={1}>
          {t('shop.searchIn', { shopName })}
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
    height: 48,
    maxHeight: 48,
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
    gap: tokens.spacing.sm,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  placeholder: {
    flex: 1,
    fontSize: tokens.fontSize.base,
    color: tokens.colors.textMuted,
  },
})
