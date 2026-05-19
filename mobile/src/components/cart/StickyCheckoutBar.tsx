import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { tokens } from '@/src/theme/tokens'

function formatMinor(amount: number, currency: 'iqd' | 'usd'): string {
  if (currency === 'iqd') return `${new Intl.NumberFormat('en-IQ').format(amount)} IQD`
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / 100)
}

interface Props {
  total: number
  currency: 'iqd' | 'usd'
  onCheckout: () => void
  disabled?: boolean
}

export function StickyCheckoutBar({ total, currency, onCheckout, disabled }: Props) {
  return (
    <View style={styles.bar}>
      <Pressable
        onPress={onCheckout}
        disabled={disabled}
        style={({ pressed }) => [
          styles.btn,
          { opacity: disabled ? 0.5 : pressed ? 0.88 : 1 },
        ]}
      >
        <Text style={styles.btnText}>Checkout</Text>
        <Text style={styles.btnTotal}>{formatMinor(total, currency)}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    height: 80,
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.sm,
    backgroundColor: tokens.colors.bg,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -3 },
    shadowRadius: 8,
    elevation: 8,
  },
  btn: {
    height: 52,
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.xl,
  },
  btnText: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.white,
  },
  btnTotal: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.bold,
    color: 'rgba(255,255,255,0.88)',
  },
})
