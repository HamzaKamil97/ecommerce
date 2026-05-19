import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { tokens } from '@/src/theme/tokens'
import { t } from '@/src/i18n'

function formatMinor(amount: number, currency: 'iqd' | 'usd'): string {
  if (currency === 'iqd') return `${new Intl.NumberFormat('en-IQ').format(amount)} IQD`
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / 100)
}

interface StoreDelivery {
  shopName: string
  fee: number
  currency: 'iqd' | 'usd'
}

interface Props {
  subtotal: number
  currency: 'iqd' | 'usd'
  deliveries: StoreDelivery[]
}

export function CartSummary({ subtotal, currency, deliveries }: Props) {
  const totalDelivery = deliveries.reduce((n, d) => n + d.fee, 0)
  const total = subtotal + totalDelivery

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{t('cart.orderSummary')}</Text>

      <View style={styles.row}>
        <Text style={styles.label}>{t('cart.subtotal')}</Text>
        <Text style={styles.value}>{formatMinor(subtotal, currency)}</Text>
      </View>

      {deliveries.map((d) => (
        <View key={d.shopName} style={styles.row}>
          <Text style={styles.label}>{t('cart.delivery')} · {d.shopName}</Text>
          <Text style={styles.value}>
            {d.fee === 0 ? t('cart.freeDelivery') : formatMinor(d.fee, d.currency)}
          </Text>
        </View>
      ))}

      <View style={[styles.row, styles.totalRow]}>
        <Text style={styles.totalLabel}>{t('cart.total')}</Text>
        <Text style={styles.totalValue}>{formatMinor(total, currency)}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: tokens.spacing.lg,
    marginVertical: tokens.spacing.md,
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.lg,
    gap: tokens.spacing.xs,
  },
  heading: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: tokens.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: tokens.spacing.xs,
  },
  label: {
    fontSize: tokens.fontSize.base,
    color: tokens.colors.textMuted,
  },
  value: {
    fontSize: tokens.fontSize.base,
    color: tokens.colors.text,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border,
    marginTop: tokens.spacing.xs,
    paddingTop: tokens.spacing.sm,
  },
  totalLabel: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  totalValue: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
})
