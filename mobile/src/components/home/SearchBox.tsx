import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
// Two separate Pressables side-by-side: avoids parent Pressable swallowing the
// filter tap on some Android devices.
import { tokens } from '@/src/theme/tokens'

interface Props {
  placeholder?: string
  onPress: () => void
  onFilter?: () => void
}

export function SearchBox({
  placeholder = 'Search for shops, categories or products',
  onPress,
  onFilter,
}: Props) {
  return (
    <View style={styles.container}>
      <Pressable onPress={onPress} style={styles.searchArea}>
        <Text style={styles.icon}>🔍</Text>
        <Text style={styles.placeholder} numberOfLines={1}>
          {placeholder}
        </Text>
      </Pressable>
      {onFilter && (
        <Pressable onPress={onFilter} style={styles.filterBtn} hitSlop={12}>
          <Text style={styles.filterIcon}>≡</Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    height: 44,
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  searchArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    height: '100%',
  },
  icon: {
    fontSize: 16,
  },
  placeholder: {
    flex: 1,
    fontSize: tokens.fontSize.base,
    color: tokens.colors.textMuted,
  },
  filterBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: tokens.colors.border,
  },
  filterIcon: {
    fontSize: 18,
    color: tokens.colors.textMuted,
    fontWeight: '700',
  },
})
