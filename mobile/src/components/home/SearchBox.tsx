import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { tokens } from '@/src/theme/tokens'
import { useFilterStore } from '@/src/store/filterStore'

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
  const activeCount = useFilterStore((s) => {
    let n = 0
    if (s.vertical) n++
    if (s.deliveryUnder !== null) n++
    if (s.minRating !== null) n++
    if (s.sortBy) n++
    return n
  })

  return (
    <View style={styles.container}>
      <Pressable onPress={onPress} style={styles.searchArea}>
        <Ionicons name="search" size={18} color={tokens.colors.textMuted} />
        <Text style={styles.placeholder} numberOfLines={1}>
          {placeholder}
        </Text>
      </Pressable>
      {onFilter && (
        <Pressable onPress={onFilter} style={styles.filterBtn} hitSlop={12}>
          <Ionicons name="options-outline" size={20} color={tokens.colors.textMuted} />
          {activeCount > 0 && <View style={styles.activeDot} />}
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    height: 48,
    maxHeight: 48,
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    overflow: 'hidden',
  },
  searchArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    height: '100%',
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
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: tokens.colors.accent,
  },
})
