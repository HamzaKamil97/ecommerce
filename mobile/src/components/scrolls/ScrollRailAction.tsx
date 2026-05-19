import React from 'react'
import { Pressable, Text, StyleSheet } from 'react-native'
import { tokens } from '@/src/theme/tokens'

interface Props {
  icon: string
  label: string
  subLabel?: string
  onPress: () => void
  active?: boolean
}

export function ScrollRailAction({ icon, label, subLabel, onPress, active }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.item} hitSlop={8}>
      <Text style={[styles.icon, active && styles.iconActive]}>{icon}</Text>
      <Text style={styles.label}>{subLabel ?? label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  item: {
    alignItems: 'center',
    gap: 2,
  },
  icon: {
    fontSize: 30,
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
