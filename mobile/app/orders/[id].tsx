import React from 'react'
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Stack, useLocalSearchParams } from 'expo-router'
import { tokens } from '@/src/theme/tokens'
import { EmptyState } from '@/src/components/EmptyState'
import { t } from '@/src/i18n'
import { useLanguageStore } from '@/src/store/languageStore'
import { findDemoOrder } from '@/src/data/demoOrders'
import {
  StatusCard,
  TimelineCard,
  ShopCard,
  ItemsCard,
  DeliveryCard,
  PaymentCard,
} from '@/src/components/orders/OrderDetailSections'

export default function OrderDetailScreen() {
  useLanguageStore((s) => s.locale)
  const { id } = useLocalSearchParams<{ id: string }>()
  const order = findDemoOrder(id)

  if (!order) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ title: t('orders.notFound') }} />
        <EmptyState title={t('orders.notFound')} />
      </SafeAreaView>
    )
  }

  const isOutForDelivery = order.status === 'out_for_delivery'

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ title: `Order #${order.displayId}` }} />

      {isOutForDelivery && (
        <View style={styles.stickyBanner}>
          <Ionicons name="bicycle" size={16} color={tokens.colors.primary} />
          <Text style={styles.stickyBannerText}>
            {t('orders.arrivingIn', { eta: order.eta ?? '' })}
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        <StatusCard order={order} />
        <TimelineCard order={order} />
        <ShopCard order={order} />
        <ItemsCard order={order} />
        <DeliveryCard order={order} />
        <PaymentCard order={order} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.colors.surface,
  },
  scroll: {
    padding: tokens.spacing.lg,
    gap: tokens.spacing.lg,
    paddingBottom: tokens.spacing.xxl,
  },
  stickyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    backgroundColor: tokens.colors.primary + '15',
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.primary + '33',
  },
  stickyBannerText: {
    color: tokens.colors.primary,
    fontWeight: tokens.fontWeight.bold,
    fontSize: tokens.fontSize.base,
  },
})
