import React, { useEffect, useState } from 'react'
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { tokens } from '@/src/theme/tokens'
import { t } from '@/src/i18n'
import { useFilterStore, type SortBy } from '@/src/store/filterStore'

interface Props {
  visible: boolean
  onClose: () => void
}

interface LocalState {
  vertical: string | null
  deliveryUnder: number | null
  minRating: number | null
  sortBy: SortBy
}

const EMPTY_STATE: LocalState = {
  vertical: null,
  deliveryUnder: null,
  minRating: null,
  sortBy: null,
}

interface ChipGroupProps<T extends string | number | null> {
  label: string
  options: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
}

function ChipGroup<T extends string | number | null>({
  label,
  options,
  value,
  onChange,
}: ChipGroupProps<T>) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.chipsRow}>
        {options.map((opt) => {
          const active = value === opt.id
          return (
            <Pressable
              key={String(opt.id)}
              onPress={() => onChange(active ? (null as T) : opt.id)}
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

export function FilterSheet({ visible, onClose }: Props) {
  const storedVertical = useFilterStore((s) => s.vertical)
  const storedDelivery = useFilterStore((s) => s.deliveryUnder)
  const storedRating = useFilterStore((s) => s.minRating)
  const storedSort = useFilterStore((s) => s.sortBy)
  const setAll = useFilterStore((s) => s.setAll)
  const clearStore = useFilterStore((s) => s.clear)

  const [state, setState] = useState<LocalState>(EMPTY_STATE)

  useEffect(() => {
    if (visible) {
      setState({
        vertical: storedVertical,
        deliveryUnder: storedDelivery,
        minRating: storedRating,
        sortBy: storedSort,
      })
    }
  }, [visible, storedVertical, storedDelivery, storedRating, storedSort])

  function handleClear() {
    setState(EMPTY_STATE)
    clearStore()
    onClose()
  }

  function handleApply() {
    setAll(state)
    onClose()
  }

  const verticals: { id: string; label: string }[] = [
    { id: 'Food', label: 'Food' },
    { id: 'Grocery', label: 'Grocery' },
    { id: 'Fashion', label: 'Fashion' },
    { id: 'Electronics', label: 'Electronics' },
    { id: 'Home', label: 'Home' },
  ]

  const delivery: { id: number; label: string }[] = [
    { id: 30, label: t('home.filters.under30') },
    { id: 60, label: t('home.filters.30to60') },
  ]

  const ratings: { id: number; label: string }[] = [
    { id: 4.0, label: t('home.filters.rating4') },
    { id: 4.5, label: t('home.filters.rating45') },
  ]

  const sort: { id: SortBy; label: string }[] = [
    { id: 'distance', label: t('home.filters.sortDistance') },
    { id: 'rating', label: t('home.filters.sortRating') },
    { id: 'deliveryTime', label: t('home.filters.sortDelivery') },
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
            onChange={(v) => setState((p) => ({ ...p, vertical: v }))}
          />
          <ChipGroup
            label={t('home.filters.deliveryTime')}
            options={delivery}
            value={state.deliveryUnder}
            onChange={(v) => setState((p) => ({ ...p, deliveryUnder: v }))}
          />
          <ChipGroup
            label={t('home.filters.rating')}
            options={ratings}
            value={state.minRating}
            onChange={(v) => setState((p) => ({ ...p, minRating: v }))}
          />
          <ChipGroup
            label={t('home.filters.sort')}
            options={sort}
            value={state.sortBy}
            onChange={(v) => setState((p) => ({ ...p, sortBy: v }))}
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
