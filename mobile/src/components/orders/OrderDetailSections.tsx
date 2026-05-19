import React from 'react'
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { tokens } from '@/src/theme/tokens'
import { t } from '@/src/i18n'
import { useLanguageStore } from '@/src/store/languageStore'
import type { DemoOrder } from '@/src/data/demoOrders'
import { OrderTimeline } from './OrderTimeline'
import { OrderStatusPill } from './OrderStatusPill'
import { humanizeRelative } from '@/src/utils/relativeTime'

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>
}

export function StatusCard({ order }: { order: DemoOrder }) {
  useLanguageStore((s) => s.locale)
  let headline: string | null = null
  if (order.status === 'delivered') {
    headline = `Delivered ${humanizeRelative(order.delivered_at).toLowerCase()}`
  } else if (order.status === 'cancelled') {
    headline = 'Order cancelled'
  } else if (order.eta) {
    headline = t('orders.arrivingIn', { eta: order.eta })
  }

  return (
    <Card>
      <OrderStatusPill status={order.status} size="lg" />
      {headline && <Text style={styles.statusHeadline}>{headline}</Text>}
      <Text style={styles.placedRelative}>
        Placed {humanizeRelative(order.placed_at).toLowerCase()}
      </Text>
    </Card>
  )
}

export function TimelineCard({ order }: { order: DemoOrder }) {
  useLanguageStore((s) => s.locale)
  return (
    <Card>
      <Text style={styles.cardTitle}>{t('orders.orderProgress')}</Text>
      <View style={{ marginTop: tokens.spacing.md }}>
        <OrderTimeline
          status={order.status}
          timestamps={{
            placed_at: order.placed_at,
            confirmed_at: order.confirmed_at,
            prepared_at: order.prepared_at,
            picked_up_at: order.picked_up_at,
            delivered_at: order.delivered_at,
          }}
        />
      </View>
    </Card>
  )
}

export function ShopCard({ order }: { order: DemoOrder }) {
  useLanguageStore((s) => s.locale)
  return (
    <Card>
      <View style={styles.shopRow}>
        <Image source={{ uri: order.shopLogoUrl }} style={styles.shopLogo} resizeMode="cover" />
        <View style={styles.shopInfo}>
          <Text style={styles.shopName}>{order.shopName}</Text>
          <Text style={styles.shopVertical}>{order.vertical}</Text>
        </View>
      </View>
      <Pressable
        style={styles.secondaryBtn}
        onPress={() => Alert.alert(t('orders.contactShop'), 'Coming soon')}
      >
        <Text style={styles.secondaryBtnText}>{t('orders.contactShop')}</Text>
      </Pressable>
    </Card>
  )
}

export function ItemsCard({ order }: { order: DemoOrder }) {
  return (
    <Card>
      <Text style={styles.cardTitle}>Items ({order.items.length})</Text>
      <View style={{ marginTop: tokens.spacing.md, gap: tokens.spacing.md }}>
        {order.items.map((item, idx) => (
          <View key={idx} style={styles.itemRow}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.itemThumb} resizeMode="cover" />
            ) : (
              <View style={[styles.itemThumb, styles.itemThumbPlaceholder]} />
            )}
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.itemQty}>Qty {item.qty}</Text>
            </View>
            <Text style={styles.itemPrice}>{item.price}</Text>
          </View>
        ))}
      </View>
      <View style={styles.divider} />
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Subtotal</Text>
        <Text style={styles.totalValue}>{order.total}</Text>
      </View>
    </Card>
  )
}

export function DeliveryCard({ order }: { order: DemoOrder }) {
  useLanguageStore((s) => s.locale)
  return (
    <Card>
      <Text style={styles.cardTitle}>{t('orders.deliveryAddress')}</Text>
      <View style={styles.addressRow}>
        <Text style={styles.addressLabel}>{order.address.label}</Text>
        <Text style={styles.addressLine}>{order.address.line}</Text>
      </View>
      {order.courier ? (
        <>
          <View style={styles.divider} />
          <Text style={styles.courierName}>🛵 {order.courier.name}</Text>
          <Text style={styles.courierPhone}>{order.courier.phone}</Text>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => Alert.alert(t('orders.callCourier'), 'Coming soon')}
          >
            <Text style={styles.secondaryBtnText}>{t('orders.callCourier')}</Text>
          </Pressable>
        </>
      ) : null}
    </Card>
  )
}

export function PaymentCard({ order }: { order: DemoOrder }) {
  useLanguageStore((s) => s.locale)
  return (
    <Card>
      <Text style={styles.cardTitle}>{t('orders.payment')}</Text>
      <View style={styles.payRow}>
        <Text style={styles.payLabel}>Method</Text>
        <Text style={styles.payValue}>💵 {t('orders.cashOnDelivery')}</Text>
      </View>
      <View style={styles.payRow}>
        <Text style={styles.payLabel}>Items</Text>
        <Text style={styles.payValue}>{order.total}</Text>
      </View>
      <View style={styles.payRow}>
        <Text style={styles.payLabel}>Delivery</Text>
        <Text style={styles.payValue}>Free</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.payRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{order.total}</Text>
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.colors.bg,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    ...tokens.shadow.card,
  },
  cardTitle: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  statusHeadline: {
    marginTop: tokens.spacing.md,
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  placedRelative: {
    marginTop: tokens.spacing.xs,
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textMuted,
  },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
  },
  shopLogo: {
    width: 56,
    height: 56,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.surface,
  },
  shopInfo: { flex: 1 },
  shopName: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  shopVertical: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textMuted,
    marginTop: 2,
  },
  secondaryBtn: {
    marginTop: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.primary,
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.spacing.sm,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: tokens.colors.primary,
    fontWeight: tokens.fontWeight.semibold,
    fontSize: tokens.fontSize.base,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
  },
  itemThumb: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.sm,
    backgroundColor: tokens.colors.surface,
  },
  itemThumbPlaceholder: {
    backgroundColor: tokens.colors.surfaceAlt,
  },
  itemInfo: { flex: 1 },
  itemName: {
    fontSize: tokens.fontSize.base,
    color: tokens.colors.text,
    fontWeight: tokens.fontWeight.medium,
  },
  itemQty: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textMuted,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: tokens.fontSize.base,
    color: tokens.colors.text,
    fontWeight: tokens.fontWeight.semibold,
  },
  divider: {
    height: 1,
    backgroundColor: tokens.colors.border,
    marginVertical: tokens.spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  addressRow: {
    marginTop: tokens.spacing.sm,
  },
  addressLabel: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.text,
  },
  addressLine: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textMuted,
    marginTop: 2,
  },
  courierName: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.text,
  },
  courierPhone: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textMuted,
    marginTop: 2,
  },
  payRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: tokens.spacing.sm,
  },
  payLabel: {
    fontSize: tokens.fontSize.base,
    color: tokens.colors.textMuted,
  },
  payValue: {
    fontSize: tokens.fontSize.base,
    color: tokens.colors.text,
    fontWeight: tokens.fontWeight.medium,
  },
})
