import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { tokens } from '@/src/theme/tokens'
import { t } from '@/src/i18n'
import { useLanguageStore } from '@/src/store/languageStore'
import type { DemoOrder, OrderStatus } from '@/src/data/demoOrders'
import { formatHHMM } from '@/src/utils/relativeTime'

type Timestamps = {
  placed_at: string
  confirmed_at?: string
  prepared_at?: string
  picked_up_at?: string
  delivered_at?: string
}

interface Props {
  status: DemoOrder['status']
  timestamps: Timestamps
}

type StepKey = 'placed' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered'

const STEP_ORDER: StepKey[] = ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered']

const STEP_ICONS: Record<StepKey, string> = {
  placed: '📝',
  confirmed: '🏪',
  preparing: '👨‍🍳',
  out_for_delivery: '🛵',
  delivered: '📦',
}

const LABEL_KEYS: Record<StepKey, 'orderTimeline.placed' | 'orderTimeline.confirmed' | 'orderTimeline.preparing' | 'orderTimeline.out_for_delivery' | 'orderTimeline.delivered'> = {
  placed: 'orderTimeline.placed',
  confirmed: 'orderTimeline.confirmed',
  preparing: 'orderTimeline.preparing',
  out_for_delivery: 'orderTimeline.out_for_delivery',
  delivered: 'orderTimeline.delivered',
}

function statusToActiveIndex(status: OrderStatus): number {
  switch (status) {
    case 'placed': return 0
    case 'confirmed': return 1
    case 'preparing': return 2
    case 'out_for_delivery': return 3
    case 'delivered': return 4
    default: return 0
  }
}

function stampFor(step: StepKey, ts: Timestamps): string | undefined {
  switch (step) {
    case 'placed': return ts.placed_at
    case 'confirmed': return ts.confirmed_at
    case 'preparing': return ts.prepared_at
    case 'out_for_delivery': return ts.picked_up_at
    case 'delivered': return ts.delivered_at
  }
}

export function OrderTimeline({ status, timestamps }: Props) {
  useLanguageStore((s) => s.locale)

  if (status === 'cancelled') {
    return (
      <View style={styles.cancelledRow}>
        <View style={styles.cancelledCircle}>
          <Text style={styles.cancelledIcon}>✕</Text>
        </View>
        <Text style={styles.cancelledLabel}>{t('orderStatus.cancelled')}</Text>
      </View>
    )
  }

  const activeIndex = statusToActiveIndex(status)

  return (
    <View>
      {STEP_ORDER.map((step, idx) => {
        const isCompleted = idx < activeIndex
        const isActive = idx === activeIndex
        const isLast = idx === STEP_ORDER.length - 1
        const stamp = stampFor(step, timestamps)
        const showStamp = (isCompleted || isActive) && !!stamp

        return (
          <View key={step} style={styles.row}>
            <View style={styles.gutter}>
              <View
                style={[
                  styles.circle,
                  isCompleted && styles.circleCompleted,
                  isActive && styles.circleActive,
                  !isCompleted && !isActive && styles.circleUpcoming,
                ]}
              >
                {isCompleted ? (
                  <Text style={styles.checkText}>✓</Text>
                ) : isActive ? (
                  <Text style={styles.activeIcon}>{STEP_ICONS[step]}</Text>
                ) : null}
              </View>
              {!isLast && (
                <View
                  style={[
                    styles.connector,
                    { backgroundColor: isCompleted ? tokens.colors.primary : tokens.colors.border },
                  ]}
                />
              )}
            </View>
            <View style={styles.content}>
              <Text
                style={[
                  styles.label,
                  isActive && styles.labelActive,
                  !isCompleted && !isActive && styles.labelUpcoming,
                ]}
              >
                {t(LABEL_KEYS[step])}
              </Text>
              {showStamp && stamp ? (
                <Text style={styles.stamp}>{formatHHMM(stamp)}</Text>
              ) : null}
            </View>
          </View>
        )
      })}
    </View>
  )
}

const CIRCLE_SIZE = 28
const ACTIVE_SIZE = 32

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.spacing.md,
  },
  gutter: {
    width: ACTIVE_SIZE,
    alignItems: 'center',
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  circleCompleted: {
    backgroundColor: tokens.colors.primary,
    borderColor: tokens.colors.primary,
  },
  circleActive: {
    width: ACTIVE_SIZE,
    height: ACTIVE_SIZE,
    borderRadius: ACTIVE_SIZE / 2,
    backgroundColor: tokens.colors.primary + '15',
    borderColor: tokens.colors.primary,
  },
  circleUpcoming: {
    backgroundColor: tokens.colors.bg,
    borderColor: tokens.colors.border,
  },
  checkText: {
    color: tokens.colors.white,
    fontSize: 14,
    fontWeight: tokens.fontWeight.bold,
  },
  activeIcon: {
    fontSize: 16,
  },
  connector: {
    width: 2,
    flex: 1,
    minHeight: 24,
    marginVertical: 2,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: tokens.spacing.lg,
  },
  label: {
    fontSize: tokens.fontSize.base,
    color: tokens.colors.text,
    fontWeight: tokens.fontWeight.medium,
    flex: 1,
  },
  labelActive: {
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  labelUpcoming: {
    color: tokens.colors.textSubtle,
    fontWeight: tokens.fontWeight.regular,
  },
  stamp: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textMuted,
    marginLeft: tokens.spacing.sm,
  },
  cancelledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
  },
  cancelledCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: tokens.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelledIcon: {
    color: tokens.colors.white,
    fontSize: 16,
    fontWeight: tokens.fontWeight.bold,
  },
  cancelledLabel: {
    color: tokens.colors.danger,
    fontWeight: tokens.fontWeight.bold,
    fontSize: tokens.fontSize.md,
  },
})
