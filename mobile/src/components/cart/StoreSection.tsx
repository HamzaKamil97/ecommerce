import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { tokens } from '@/src/theme/tokens'
import type { CartItem } from '@/src/store/cartStore'
import { CartLineItem } from './CartLineItem'
import { useRouter } from 'expo-router'
import { useCartStore } from '@/src/store/cartStore'

function formatMinor(amount: number, currency: 'iqd' | 'usd'): string {
  if (currency === 'iqd') return `${new Intl.NumberFormat('en-IQ').format(amount)} IQD`
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / 100)
}

interface Props {
  shopName: string
  shopSlug: string
  deliveryInfo?: string
  items: CartItem[]
  onClearStore: () => void
}

export function StoreSection({ shopName, shopSlug, deliveryInfo, items, onClearStore }: Props) {
  const router = useRouter()
  const incQty = useCartStore((s) => s.incQty)
  const decQty = useCartStore((s) => s.decQty)
  const removeItem = useCartStore((s) => s.removeItem)

  const currency = items[0]?.currency_code ?? 'iqd'
  const storeSubtotal = items.reduce((n, i) => n + i.qty * i.unit_price_minor, 0)

  return (
    <View style={styles.section}>
      {/* Store header */}
      <View style={styles.storeHeader}>
        <View style={styles.storeName}>
          <Text style={styles.storeNameText}>{shopName}</Text>
          {deliveryInfo && <Text style={styles.deliveryInfo}>{deliveryInfo}</Text>}
        </View>
        <View style={styles.storeActions}>
          <Pressable
            onPress={() => router.push(`/shops/${shopSlug}`)}
            style={styles.addMoreBtn}
          >
            <Text style={styles.addMoreText}>+ Add more</Text>
          </Pressable>
          <Pressable onPress={onClearStore} hitSlop={8} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>✕</Text>
          </Pressable>
        </View>
      </View>

      {/* Line items */}
      <View style={styles.items}>
        {items.map((item) => (
          <CartLineItem
            key={item.variant_id}
            item={item}
            onInc={() => incQty(item.variant_id)}
            onDec={() => decQty(item.variant_id)}
            onRemove={() => removeItem(item.variant_id)}
            onPress={() => router.push(`/products/${item.product_handle}`)}
          />
        ))}
      </View>

      {/* Store subtotal */}
      <View style={styles.subtotalRow}>
        <Text style={styles.subtotalLabel}>Store subtotal</Text>
        <Text style={styles.subtotalValue}>{formatMinor(storeSubtotal, currency)}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: tokens.colors.bg,
    marginBottom: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: tokens.colors.border,
    marginHorizontal: tokens.spacing.lg,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    backgroundColor: tokens.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
  },
  storeName: {
    flex: 1,
    gap: 2,
  },
  storeNameText: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  deliveryInfo: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textMuted,
  },
  storeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  addMoreBtn: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 4,
  },
  addMoreText: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.primary,
  },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    fontSize: 12,
    color: tokens.colors.textMuted,
    fontWeight: tokens.fontWeight.bold,
  },
  items: {
    paddingHorizontal: tokens.spacing.md,
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: tokens.colors.border,
  },
  subtotalLabel: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textMuted,
  },
  subtotalValue: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.text,
  },
})
