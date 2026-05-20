import React, { useState } from 'react'
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { tokens } from '@/src/theme/tokens'
import { t } from '@/src/i18n'

interface Props {
  visible: boolean
  onClose: () => void
  onApply?: (state: FilterState) => void
}

export interface FilterState {
  vertical: string | null
  deliveryTime: string | null
  rating: string | null
  sort: string | null
}

const EMPTY_STATE: FilterState = {
  vertical: null,
  deliveryTime: null,
  rating: null,
  sort: null,
}

interface ChipGroupProps {
  label: string
  options: { id: string; label: string }[]
  value: string | null
  onChange: (id: string | null) => void
}

function ChipGroup({ label, options, value, onChange }: ChipGroupProps) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.chipsRow}>
        {options.map((opt) => {
          const active = value === opt.id
          return (
            <Pressable
              key={opt.id}
              onPress={() => onChange(active ? null : opt.id)}
              style={({ pressed }) => [
                styles.chip,
                active && styles.chipActive,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

export function FilterSheet({ visible, onClose, onApply }: Props) {
  const [state, setState] = useState<FilterState>(EMPTY_STATE)

  function update<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  function handleClear() {
    setState(EMPTY_STATE)
  }

  function handleApply() {
    onApply?.(state)
    onClose()
  }

  const verticals = [
    { id: 'food', label: 'Food' },
    { id: 'grocery', label: 'Grocery' },
    { id: 'fashion', label: 'Fashion' },
    { id: 'electronics', label: 'Electronics' },
    { id: 'home', label: 'Home' },
  ]

  const delivery = [
    { id: 'under30', label: t('home.filters.under30') },
    { id: '30to60', label: t('home.filters.30to60') },
  ]

  const ratings = [
    { id: 'rating4', label: t('home.filters.rating4') },
    { id: 'rating45', label: t('home.filters.rating45') },
  ]

  const sort = [
    { id: 'distance', label: t('home.filters.sortDistance') },
    { id: 'rating', label: t('home.filters.sortRating') },
    { id: 'delivery', label: t('home.filters.sortDelivery') },
  ]

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.title}>{t('home.filters.title')}</Text>
          <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={tokens.colors.text} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <ChipGroup
            label={t('home.filters.vertical')}
            options={verticals}
            value={state.vertical}
            onChange={(v) => update('vertical', v)}
          />
          <ChipGroup
            label={t('home.filters.deliveryTime')}
            options={delivery}
            value={state.deliveryTime}
            onChange={(v) => update('deliveryTime', v)}
          />
          <ChipGroup
            label={t('home.filters.rating')}
            options={ratings}
            value={state.rating}
            onChange={(v) => update('rating', v)}
          />
          <ChipGroup
            label={t('home.filters.sort')}
            options={sort}
            value={state.sort}
            onChange={(v) => update('sort', v)}
          />
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={handleClear}
            style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.clearText}>{t('home.filters.clear')}</Text>
          </Pressable>
          <Pressable
            onPress={handleApply}
            style={({ pressed }) => [styles.applyBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.applyText}>{t('home.filters.apply')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: tokens.colors.bg,
    borderTopLeftRadius: tokens.radius.lg,
    borderTopRightRadius: tokens.radius.lg,
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: 36,
    paddingTop: tokens.spacing.sm,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: tokens.colors.border,
    alignSelf: 'center',
    marginBottom: tokens.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.lg,
  },
  title: {
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: tokens.spacing.md,
  },
  group: {
    marginBottom: tokens.spacing.lg,
  },
  groupLabel: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: tokens.spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.sm,
  },
  chip: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  chipActive: {
    backgroundColor: tokens.colors.primary + '15',
    borderColor: tokens.colors.primary,
  },
  chipText: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.text,
  },
  chipTextActive: {
    color: tokens.colors.primary,
    fontWeight: tokens.fontWeight.semibold,
  },
  footer: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
    paddingTop: tokens.spacing.md,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border,
  },
  clearBtn: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.bg,
  },
  clearText: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.text,
  },
  applyBtn: {
    flex: 2,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.primary,
  },
  applyText: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.white,
  },
})
