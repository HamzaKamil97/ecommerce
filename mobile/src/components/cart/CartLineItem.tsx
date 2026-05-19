import React from 'react'
import { View, Text, Image, Pressable, StyleSheet } from 'react-native'
import { tokens } from '@/src/theme/tokens'
import type { CartItem } from '@/src/store/cartStore'

function formatMinor(amount: number, currency: 'iqd' | 'usd'): string {
  if (currency === 'iqd') return `${new Intl.NumberFormat('en-IQ').format(amount)} IQD`
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / 100)
}

interface Props {
  item: CartItem
  onInc: () => void
  onDec: () => void
  onRemove: () => void
  onPress: () => void
}

export function CartLineItem({ item, onInc, onDec, onRemove, onPress }: Props) {
  const lineTotal = item.qty * item.unit_price_minor

  return (
    <View style={styles.row}>
      <Pressable onPress={onPress}>
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={styles.img} resizeMode="cover" />
        ) : (
          <View style={[styles.img, styles.imgPlaceholder]} />
        )}
      </Pressable>

      <View style={styles.body}>
        <Pressable onPress={onPress}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        </Pressable>
        <Text style={styles.unitPrice}>{formatMinor(item.unit_price_minor, item.currency_code)}</Text>

        <View style={styles.footer}>
          <View style={styles.stepper}>
            <Pressable onPress={onDec} style={styles.stepBtn} hitSlop={8}>
              <Text style={styles.stepBtnText}>−</Text>
            </Pressable>
            <Text style={styles.qty}>{item.qty}</Text>
            <Pressable onPress={onInc} style={[styles.stepBtn, styles.stepBtnPlus]} hitSlop={8}>
              <Text style={[styles.stepBtnText, { color: tokens.colors.white }]}>+</Text>
            </Pressable>
          </View>
          <Text style={styles.lineTotal}>{formatMinor(lineTotal, item.currency_code)}</Text>
          <Pressable onPress={onRemove} hitSlop={8} style={styles.trashBtn}>
            <Text style={styles.trashIcon}>🗑</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.border,
  },
  img: {
    width: 60,
    height: 60,
    borderRadius: tokens.radius.sm,
  },
  imgPlaceholder: {
    backgroundColor: tokens.colors.surface,
  },
  body: {
    flex: 1,
    gap: tokens.spacing.xs,
  },
  title: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.text,
    lineHeight: 20,
  },
  unitPrice: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textMuted,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    overflow: 'hidden',
  },
  stepBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colors.surface,
  },
  stepBtnPlus: {
    backgroundColor: tokens.colors.primary,
  },
  stepBtnText: {
    fontSize: 15,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  qty: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  lineTotal: {
    flex: 1,
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
    textAlign: 'right',
  },
  trashBtn: {
    padding: tokens.spacing.xs,
  },
  trashIcon: {
    fontSize: 16,
  },
})
