import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { tokens } from '@/src/theme/tokens'
import { t } from '@/src/i18n'
import { useLanguageStore } from '@/src/store/languageStore'
import type { OrderStatus } from '@/src/data/demoOrders'

interface Props {
  status: OrderStatus
  size?: 'sm' | 'lg'
}

const INFO_COLOR = '#3B82F6'

function colorFor(status: OrderStatus): string {
  switch (status) {
    case 'placed':
    case 'confirmed':
      return INFO_COLOR
    case 'preparing':
      return tokens.colors.accent
    case 'out_for_delivery':
      return tokens.colors.primary
    case 'delivered':
      return tokens.colors.success
    case 'cancelled':
      return tokens.colors.danger
  }
}

function labelKeyFor(status: OrderStatus) {
  switch (status) {
    case 'placed': return 'orderStatus.placed' as const
    case 'confirmed': return 'orderStatus.confirmed' as const
    case 'preparing': return 'orderStatus.preparing' as const
    case 'out_for_delivery': return 'orderStatus.out_for_delivery' as const
    case 'delivered': return 'orderStatus.delivered' as const
    case 'cancelled': return 'orderStatus.cancelled' as const
  }
}

export function OrderStatusPill({ status, size = 'sm' }: Props) {
  useLanguageStore((s) => s.locale)
  const color = colorFor(status)
  const isLg = size === 'lg'

  return (
    <View
      style={[
        styles.pill,
        isLg ? styles.pillLg : styles.pillSm,
        { backgroundColor: color + '22' },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text
        style={[
          styles.text,
          isLg ? styles.textLg : styles.textSm,
          { color },
        ]}
      >
        {t(labelKeyFor(status))}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: tokens.radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pillSm: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
  },
  pillLg: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontWeight: tokens.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  textSm: {
    fontSize: 10,
  },
  textLg: {
    fontSize: tokens.fontSize.sm,
  },
})
