import React, { useEffect, useMemo, useState } from 'react'
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { tokens } from '@/src/theme/tokens'
import { t } from '@/src/i18n'
import { useLanguageStore } from '@/src/store/languageStore'
import {
  ProductOption,
  SelectedOptions,
  computeOptionsTotal,
  initialSelection,
  validateSelection,
} from '@/src/types/productOptions'

interface Props {
  visible: boolean
  onClose: () => void
  product: {
    id: string
    title: string
    thumbnail: string | null
    basePriceMinor: number
    currency: string
    options?: ProductOption[]
  }
  shop: { slug: string; name: string; currency: 'iqd' | 'usd' }
  onConfirm: (params: {
    quantity: number
    notes: string
    selected: SelectedOptions
    lineTotalMinor: number
  }) => void
}

function formatMinor(amount: number, currencyCode: string): string {
  if (currencyCode.toUpperCase() === 'IQD') {
    return `${new Intl.NumberFormat('en-IQ').format(Math.round(amount))} IQD`
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / 100)
}

function formatDelta(delta: number, currencyCode: string): string {
  if (delta === 0) return ''
  const sign = delta > 0 ? '+' : '−'
  return ` ${sign}${formatMinor(Math.abs(delta), currencyCode)}`
}

export function AddToCartSheet({ visible, onClose, product, shop, onConfirm }: Props) {
  useLanguageStore((s) => s.locale)
  const options = product.options ?? []
  const [selected, setSelected] = useState<SelectedOptions>(() => initialSelection(options))
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (visible) {
      setSelected(initialSelection(options))
      setQuantity(1)
      setNotes('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, product.id])

  const optionsTotal = useMemo(() => computeOptionsTotal(options, selected), [options, selected])
  const unitPriceMinor = product.basePriceMinor + optionsTotal
  const lineTotalMinor = unitPriceMinor * quantity

  const validation = useMemo(() => validateSelection(options, selected), [options, selected])
  const canConfirm = validation.ok

  function toggleChoice(opt: ProductOption, choiceId: string) {
    setSelected((prev) => {
      const current = prev[opt.id] ?? []
      if (opt.type === 'single') {
        return { ...prev, [opt.id]: [choiceId] }
      }
      const has = current.includes(choiceId)
      if (has) {
        return { ...prev, [opt.id]: current.filter((id) => id !== choiceId) }
      }
      if (opt.max && current.length >= opt.max) return prev
      return { ...prev, [opt.id]: [...current, choiceId] }
    })
  }

  function handleConfirm() {
    if (!canConfirm) return
    onConfirm({ quantity, notes: notes.trim(), selected, lineTotalMinor })
    onClose()
  }

  function rangeLabel(opt: ProductOption): string | null {
    if (opt.type !== 'multi') return null
    if (opt.min && opt.max) return t('cart.pickMinMax', { min: opt.min, max: opt.max })
    if (opt.min) return t('cart.pickAtLeast', { min: opt.min })
    if (opt.max) return t('cart.pickMinMax', { min: 0, max: opt.max })
    return null
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kbWrap}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            {product.thumbnail ? (
              <Image source={{ uri: product.thumbnail }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbFallback]}>
                <Text style={styles.thumbFallbackText}>🛍️</Text>
              </View>
            )}
            <View style={styles.headerText}>
              <Text style={styles.title} numberOfLines={2}>{product.title}</Text>
              <Text style={styles.basePrice}>
                {formatMinor(product.basePriceMinor, product.currency)}
              </Text>
              <Text style={styles.shopName} numberOfLines={1}>{shop.name}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={tokens.colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {options.map((opt) => {
              const picks = selected[opt.id] ?? []
              const range = rangeLabel(opt)
              return (
                <View key={opt.id} style={styles.optionGroup}>
                  <View style={styles.optionHeader}>
                    <Text style={styles.optionName}>{opt.name}</Text>
                    <Text
                      style={[
                        styles.optionTag,
                        opt.required ? styles.optionTagRequired : styles.optionTagOptional,
                      ]}
                    >
                      {opt.required ? t('cart.required') : t('cart.optional')}
                    </Text>
                  </View>
                  {range ? <Text style={styles.optionRange}>{range}</Text> : null}
                  {opt.choices.map((c) => {
                    const isSelected = picks.includes(c.id)
                    const isSingle = opt.type === 'single'
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => toggleChoice(opt, c.id)}
                        style={[styles.choiceRow, isSelected && styles.choiceRowActive]}
                      >
                        <View
                          style={[
                            isSingle ? styles.radio : styles.checkbox,
                            isSelected && styles.markActive,
                          ]}
                        >
                          {isSelected && isSingle ? <View style={styles.radioDot} /> : null}
                          {isSelected && !isSingle ? (
                            <Ionicons name="checkmark" size={14} color={tokens.colors.white} />
                          ) : null}
                        </View>
                        <Text style={styles.choiceLabel}>{c.label}</Text>
                        <Text style={styles.choiceDelta}>
                          {formatDelta(c.priceDelta, product.currency)}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              )
            })}

            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>{t('cart.notes')}</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder={t('cart.addNotesPlaceholder')}
                placeholderTextColor={tokens.colors.textSubtle}
                style={styles.notesInput}
                multiline
                maxLength={200}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.stepper}>
              <Pressable
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                style={styles.stepBtn}
                hitSlop={8}
              >
                <Ionicons name="remove" size={20} color={tokens.colors.text} />
              </Pressable>
              <Text style={styles.qty}>{quantity}</Text>
              <Pressable
                onPress={() => setQuantity((q) => q + 1)}
                style={styles.stepBtn}
                hitSlop={8}
              >
                <Ionicons name="add" size={20} color={tokens.colors.text} />
              </Pressable>
            </View>

            <Pressable
              onPress={handleConfirm}
              disabled={!canConfirm}
              style={[styles.addBtn, !canConfirm && styles.addBtnDisabled]}
            >
              <Text style={styles.addBtnText}>
                {canConfirm
                  ? t('cart.addForPrice', { price: formatMinor(lineTotalMinor, product.currency) })
                  : t('cart.optionsRequired', { option: validation.missingOptionName ?? '' })}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  kbWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '90%',
  },
  sheet: {
    backgroundColor: tokens.colors.bg,
    borderTopLeftRadius: tokens.radius.lg,
    borderTopRightRadius: tokens.radius.lg,
    paddingTop: tokens.spacing.sm,
    paddingBottom: 24,
    maxHeight: '100%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: tokens.colors.border,
    alignSelf: 'center',
    marginBottom: tokens.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.surfaceAlt,
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbFallbackText: { fontSize: 28 },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  basePrice: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.primary,
  },
  shopName: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textMuted,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    paddingHorizontal: tokens.spacing.lg,
  },
  optionGroup: {
    paddingVertical: tokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.xs,
  },
  optionName: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  optionTag: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.semibold,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: tokens.radius.pill,
    overflow: 'hidden',
  },
  optionTagRequired: {
    backgroundColor: tokens.colors.danger + '15',
    color: tokens.colors.danger,
  },
  optionTagOptional: {
    backgroundColor: tokens.colors.surfaceAlt,
    color: tokens.colors.textMuted,
  },
  optionRange: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textMuted,
    marginBottom: tokens.spacing.sm,
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    gap: tokens.spacing.md,
  },
  choiceRowActive: {
    backgroundColor: tokens.colors.primary + '0D',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: tokens.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: tokens.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markActive: {
    backgroundColor: tokens.colors.primary,
    borderColor: tokens.colors.primary,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.colors.white,
  },
  choiceLabel: {
    flex: 1,
    fontSize: tokens.fontSize.base,
    color: tokens.colors.text,
  },
  choiceDelta: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.textMuted,
  },
  notesSection: {
    paddingVertical: tokens.spacing.md,
  },
  notesLabel: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.sm,
  },
  notesInput: {
    minHeight: 60,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    fontSize: tokens.fontSize.base,
    color: tokens.colors.text,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.md,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border,
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
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colors.surface,
  },
  qty: {
    minWidth: 32,
    textAlign: 'center',
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  addBtn: {
    flex: 1,
    height: 48,
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.spacing.md,
  },
  addBtnDisabled: {
    backgroundColor: tokens.colors.borderStrong,
  },
  addBtnText: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.white,
    textAlign: 'center',
  },
})
