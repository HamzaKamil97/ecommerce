import React, { useState, useCallback } from 'react'
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { tokens } from '@/src/theme/tokens'
import { t } from '@/src/i18n'
import { useLanguageStore } from '@/src/store/languageStore'
import { useButlerStore, type ButlerRequestKind } from '@/src/store/butlerStore'
import { PreviewPill } from '@/src/components/PreviewPill'

interface Props {
  visible: boolean
  onClose: () => void
}

interface Preset {
  kind: ButlerRequestKind
  icon: React.ComponentProps<typeof Ionicons>['name']
  labelKey:
    | 'butler.preset.findCheaper'
    | 'butler.preset.itemNotListed'
    | 'butler.preset.compareShops'
    | 'butler.preset.bundleDeal'
}

const PRESETS: Preset[] = [
  { kind: 'find_cheaper', icon: 'pricetag', labelKey: 'butler.preset.findCheaper' },
  { kind: 'item_not_listed', icon: 'search', labelKey: 'butler.preset.itemNotListed' },
  { kind: 'compare_shops', icon: 'git-compare', labelKey: 'butler.preset.compareShops' },
  { kind: 'bundle_deal', icon: 'cube-outline', labelKey: 'butler.preset.bundleDeal' },
]

export function ButlerSheet({ visible, onClose }: Props) {
  useLanguageStore((s) => s.locale)
  const addRequest = useButlerStore((s) => s.addRequest)
  const [text, setText] = useState('')
  const [toast, setToast] = useState(false)

  const submit = useCallback(
    (kind: ButlerRequestKind, body?: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      addRequest({ kind, text: body })
      setToast(true)
      setText('')
      setTimeout(() => {
        setToast(false)
        onClose()
      }, 1100)
    },
    [addRequest, onClose],
  )

  const handlePreset = (preset: Preset) => submit(preset.kind)
  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    submit('free_text', trimmed)
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
            <View style={styles.headerLeft}>
              <View style={styles.brandRow}>
                <Ionicons name="sparkles" size={20} color={tokens.colors.accent} />
                <Text style={styles.brand}>{t('butler.title')}</Text>
              </View>
              <Text style={styles.tagline}>{t('butler.tagline')}</Text>
              <View style={styles.previewWrap}>
                <PreviewPill size="sm" />
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={tokens.colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.grid}>
            {PRESETS.map((p) => (
              <Pressable
                key={p.kind}
                style={({ pressed }) => [styles.presetCard, pressed && styles.presetPressed]}
                onPress={() => handlePreset(p)}
              >
                <Ionicons name={p.icon} size={22} color={tokens.colors.primary} />
                <Text style={styles.presetLabel}>{t(p.labelKey)}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.inputRow}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t('butler.placeholder')}
              placeholderTextColor={tokens.colors.textSubtle}
              style={styles.input}
              multiline
              maxLength={240}
            />
            <Pressable
              onPress={handleSend}
              style={({ pressed }) => [
                styles.sendBtn,
                (!text.trim() || pressed) && styles.sendBtnDisabled,
              ]}
              disabled={!text.trim()}
            >
              <Text style={styles.sendBtnText}>{t('butler.send')}</Text>
            </Pressable>
          </View>

          <Text style={styles.footer}>{t('butler.responseTime')}</Text>

          {toast && (
            <View style={styles.toast} pointerEvents="none">
              <Text style={styles.toastText}>{t('butler.sent')}</Text>
            </View>
          )}
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
  },
  sheet: {
    backgroundColor: tokens.colors.bg,
    borderTopLeftRadius: tokens.radius.lg,
    borderTopRightRadius: tokens.radius.lg,
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.sm,
    paddingBottom: 36,
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: tokens.spacing.lg,
  },
  headerLeft: {
    flex: 1,
    gap: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brand: {
    fontSize: tokens.fontSize.xl,
    fontWeight: tokens.fontWeight.extrabold,
    color: tokens.colors.text,
  },
  tagline: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textMuted,
  },
  previewWrap: {
    marginTop: tokens.spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.lg,
  },
  presetCard: {
    width: '48%',
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.md,
    gap: tokens.spacing.xs,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  presetPressed: {
    backgroundColor: tokens.colors.surfaceAlt,
  },
  presetLabel: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.text,
  },
  inputRow: {
    gap: tokens.spacing.sm,
  },
  input: {
    minHeight: 60,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    fontSize: tokens.fontSize.base,
    color: tokens.colors.text,
    textAlignVertical: 'top',
  },
  sendBtn: {
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.spacing.md,
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.white,
  },
  footer: {
    marginTop: tokens.spacing.md,
    textAlign: 'center',
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textSubtle,
  },
  toast: {
    position: 'absolute',
    top: -40,
    alignSelf: 'center',
    backgroundColor: tokens.colors.success,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.pill,
    ...tokens.shadow.floating,
  },
  toastText: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.white,
  },
})
