import React from 'react'
import { Pressable, Text, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { tokens } from '@/src/theme/tokens'

interface Props {
  icon: React.ComponentProps<typeof Ionicons>['name']
  label: string
  subLabel?: string
  onPress: () => void
  active?: boolean
  activeTint?: string
}

export function ScrollRailAction({ icon, label, subLabel, onPress, active, activeTint }: Props) {
  const tint = active ? (activeTint ?? tokens.colors.danger) : tokens.colors.white
  return (
    <Pressable onPress={onPress} style={styles.item} hitSlop={8}>
      <View style={[active && styles.iconActive]}>
        <Ionicons name={icon} size={28} color={tint} />
      </View>
      <Text style={styles.label}>{subLabel ?? label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  item: {
    alignItems: 'center',
    gap: 2,
  },
  iconActive: {
    transform: [{ scale: 1.1 }],
  },
  label: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.white,
  },
})
