import React from 'react'
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { tokens } from '@/src/theme/tokens'
import { EmptyState } from '@/src/components/EmptyState'
import { t } from '@/src/i18n'
import { useLanguageStore } from '@/src/store/languageStore'
import { findDemoOrder } from '@/src/data/demoOrders'
import { useChromeStore } from '@/src/store/chromeStore'
import {
  StatusCard,
  TimelineCard,
  ShopCard,
  ItemsCard,
  DeliveryCard,
  PaymentCard,
  OrderActionsCard,
} from '@/src/components/orders/OrderDetailSections'

export default function OrderDetailScreen() {
  React.useEffect(() => {
    useChromeStore.getState().setNajmaFabHidden(true)
    return () => useChromeStore.getState().setNajmaFabHidden(false)
  }, [])
  useLanguageStore((s) => s.locale)
  const router = useRouter()
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

        {isOutForDelivery && (
          <Pressable
            onPress={() => router.push('/games' as never)}
            style={({ pressed }) => [styles.waitGamesCard, pressed && { opacity: 0.9 }]}
          >
            <View style={styles.waitGamesIcon}>
              <Ionicons name="game-controller" size={22} color={tokens.colors.primary} />
            </View>
            <View style={styles.waitGamesText}>
              <Text style={styles.waitGamesTitle}>{t('games.entryTitle')}</Text>
              <Text style={styles.waitGamesSubtitle}>{t('games.entrySubtitle')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={tokens.colors.primary} />
          </Pressable>
        )}

        <TimelineCard order={order} />
        <ShopCard order={order} />
        <ItemsCard order={order} />
        <DeliveryCard order={order} />
        <PaymentCard order={order} />
        <OrderActionsCard order={order} />
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
  waitGamesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
    backgroundColor: tokens.colors.accentSoft,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.primary + '33',
  },
  waitGamesIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitGamesText: { flex: 1, gap: 2 },
  waitGamesTitle: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  waitGamesSubtitle: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textSubtle,
  },
})
