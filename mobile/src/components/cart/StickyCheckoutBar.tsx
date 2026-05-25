import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { tokens } from '@/src/theme/tokens'
import { t } from '@/src/i18n'
import { useCartStore } from '@/src/store/cartStore'

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
  const participants = useCartStore((s) => s.participants) ?? []
  const others = Math.max(0, participants.length - 1)
  const shoppingLabel =
    others === 1
      ? t('cart.shoppingWithN', { count: others })
      : others > 1
      ? t('cart.shoppingWithNPlural', { count: others })
      : null

  return (
    <View style={styles.bar}>
      {shoppingLabel && (
        <Text style={styles.shoppingWith}>{shoppingLabel}</Text>
      )}
      <Pressable
        onPress={onCheckout}
        disabled={disabled}
        style={({ pressed }) => [
          styles.btn,
          { opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
          pressed && !disabled && { transform: [{ scale: 0.98 }] },
        ]}
      >
        <Text style={styles.btnText}>{t('cart.checkout')}</Text>
        <Text style={styles.btnTotal}>{formatMinor(total, currency)}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  shoppingWith: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textMuted,
    textAlign: 'center',
    marginBottom: 4,
  },
  bar: {
    minHeight: 80,
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.sm,
    paddingBottom: tokens.spacing.sm,
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
    borderRadius: tokens.radius.lg,
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
