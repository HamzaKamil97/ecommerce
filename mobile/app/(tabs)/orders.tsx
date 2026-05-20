import React, { useState } from 'react'
import { FlatList, Image, Pressable, RefreshControl, SafeAreaView, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { tokens } from '@/src/theme/tokens'
import { EmptyState } from '@/src/components/EmptyState'
import { useAuthStore } from '@/src/store/authStore'
import { useLanguageStore } from '@/src/store/languageStore'
import { t } from '@/src/i18n'
import { DEMO_ORDERS, type DemoOrder } from '@/src/data/demoOrders'
import { OrderStatusPill } from '@/src/components/orders/OrderStatusPill'
import { humanizeRelative } from '@/src/utils/relativeTime'

export default function OrdersScreen() {
  useLanguageStore((s) => s.locale)
  const router = useRouter()
  const customer = useAuthStore((s) => s.customer)
  const [refreshing, setRefreshing] = useState(false)

  async function onRefresh() {
    setRefreshing(true)
    await new Promise((r) => setTimeout(r, 500))
    setRefreshing(false)
  }

  if (!customer) {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyState
          title={t('orders.loginPrompt.title')}
          subtitle={t('orders.loginPrompt.subtitle')}
        />
      </SafeAreaView>
    )
  }

  const orders = DEMO_ORDERS

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.heading}>{t('orders.title')}</Text>
      </View>
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={tokens.colors.primary}
            colors={[tokens.colors.primary]}
          />
        }
        renderItem={({ item }) => (
          <OrderCard order={item} onPress={() => router.push(`/orders/${item.id}` as never)} />
        )}
        ListEmptyComponent={
          <EmptyState
            title={t('orders.empty.title')}
            subtitle={t('orders.empty.subtitle')}
          />
        }
      />
    </SafeAreaView>
  )
}

function OrderCard({ order, onPress }: { order: DemoOrder; onPress: () => void }) {
  const isDelivered = order.status === 'delivered'
  const isCancelled = order.status === 'cancelled'
  const showEta = !isDelivered && !isCancelled && !!order.eta

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Image source={{ uri: order.shopLogoUrl }} style={styles.logo} resizeMode="cover" />
        <View style={styles.shopInfo}>
          <Text style={styles.shopName} numberOfLines={1}>{order.shopName}</Text>
          <Text style={styles.vertical} numberOfLines={1}>{order.vertical}</Text>
        </View>
        <OrderStatusPill status={order.status} />
      </View>

      <View style={styles.divider} />

      <Text style={styles.summary}>
        {t('orders.itemsCount', { count: order.items.length })} · {order.total}
      </Text>

      {showEta && (
        <Text style={styles.eta}>
          ⏱ {t('orders.arrivingIn', { eta: order.eta ?? '' })}
        </Text>
      )}

      <Text style={styles.placedAt}>{humanizeRelative(order.placed_at)}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.colors.surface,
  },
  header: {
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.md,
    backgroundColor: tokens.colors.surface,
  },
  heading: {
    fontSize: tokens.fontSize.xxl,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  listContent: {
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.xl,
  },
  separator: {
    height: tokens.spacing.md,
  },
  card: {
    backgroundColor: tokens.colors.bg,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.sm,
    ...tokens.shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.surface,
  },
  shopInfo: {
    flex: 1,
    gap: 2,
  },
  shopName: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  vertical: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: tokens.colors.border,
    marginVertical: tokens.spacing.xs,
  },
  summary: {
    fontSize: tokens.fontSize.base,
    color: tokens.colors.text,
    fontWeight: tokens.fontWeight.medium,
  },
  eta: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.primary,
    fontWeight: tokens.fontWeight.semibold,
  },
  placedAt: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textMuted,
  },
})
