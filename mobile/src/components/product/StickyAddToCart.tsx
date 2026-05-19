import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { tokens } from '@/src/theme/tokens'

function formatMinor(amount: number, currencyCode: string): string {
  if (currencyCode.toUpperCase() === 'IQD') {
    return `${new Intl.NumberFormat('en-IQ').format(amount)} IQD`
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / 100)
}

interface Props {
  quantity: number
  setQuantity: (n: number) => void
  price: number
  currencyCode: string
  onAdd: () => void
  disabled?: boolean
}

export function StickyAddToCart({ quantity, setQuantity, price, currencyCode, onAdd, disabled }: Props) {
  return (
    <View style={styles.bar}>
      {/* Qty stepper */}
      <View style={styles.stepper}>
        <Pressable
          style={styles.stepBtn}
          onPress={() => setQuantity(Math.max(1, quantity - 1))}
          hitSlop={8}
        >
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>
        <Text style={styles.qty}>{quantity}</Text>
        <Pressable
          style={[styles.stepBtn, styles.stepBtnPlus]}
          onPress={() => setQuantity(quantity + 1)}
          hitSlop={8}
        >
          <Text style={[styles.stepBtnText, { color: tokens.colors.white }]}>+</Text>
        </Pressable>
      </View>

      {/* Add to cart button */}
      <Pressable
        onPress={onAdd}
        disabled={disabled}
        style={({ pressed }) => [
          styles.addBtn,
          { opacity: disabled ? 0.5 : pressed ? 0.88 : 1 },
        ]}
      >
        <Text style={styles.addBtnText}>
          Add to cart · {formatMinor(price * quantity, currencyCode)}
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.lg,
    gap: tokens.spacing.md,
    backgroundColor: tokens.colors.bg,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -3 },
    shadowRadius: 8,
    elevation: 8,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    overflow: 'hidden',
    width: 110,
  },
  stepBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colors.surface,
  },
  stepBtnPlus: {
    backgroundColor: tokens.colors.primary,
  },
  stepBtnText: {
    fontSize: 18,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  qty: {
    flex: 1,
    textAlign: 'center',
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  addBtn: {
    flex: 1,
    height: 48,
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.white,
  },
})
