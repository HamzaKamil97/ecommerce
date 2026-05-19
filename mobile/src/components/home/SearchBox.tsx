import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { tokens } from '@/src/theme/tokens'

interface Props {
  placeholder?: string
  onPress: () => void
}

export function SearchBox({
  placeholder = 'Search for shops, categories or products',
  onPress,
}: Props) {
  return (
    <Pressable onPress={onPress} style={styles.container}>
      <Text style={styles.icon}>🔍</Text>
      <Text style={styles.placeholder} numberOfLines={1}>
        {placeholder}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
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
