import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { tokens } from '@/src/theme/tokens'

interface Props {
  title: string
  actionLabel?: string | null
  onAction?: () => void
  badge?: React.ReactNode
}

export function SectionHeader({ title, actionLabel, onAction, badge }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        {badge ? <View style={styles.badge}>{badge}</View> : null}
      </View>
      {actionLabel ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.xl,
    paddingBottom: tokens.spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    flexShrink: 1,
  },
  title: {
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  badge: {
    marginLeft: 2,
  },
  action: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.primary,
  },
})
