/**
 * LanguagePicker — bottom sheet for EN/AR language selection.
 * Taps switch language, persist via languageStore, and trigger a full app reload.
 * On Expo Go / dev client: reloadAsync is available via expo-updates if installed;
 * otherwise we call DevSettings.reload() (dev) or do a Linking-based fallback.
 */
import React from 'react'
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  DevSettings,
  Platform,
} from 'react-native'
import { tokens } from '@/src/theme/tokens'
import { useLanguageStore } from '@/src/store/languageStore'
import type { Locale } from '@/src/i18n'

interface Option {
  code: Locale
  flag: string
  label: string
  nativeLabel: string
}

const OPTIONS: Option[] = [
  { code: 'en', flag: '🇺🇸', label: 'English', nativeLabel: 'English' },
  { code: 'ar', flag: '🇮🇶', label: 'Arabic', nativeLabel: 'العربية' },
]

interface Props {
  visible: boolean
  onClose: () => void
}

function reloadApp() {
  // expo-updates not installed — use DevSettings on native dev, hard-reload on web.
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
    return
  }
  try {
    DevSettings.reload()
  } catch {
    // In production builds DevSettings may not be available.
    // The language is already persisted; user will see it on next cold start.
    console.warn('[LanguagePicker] Could not reload — language persisted for next launch.')
  }
}

export function LanguagePicker({ visible, onClose }: Props) {
  const locale = useLanguageStore((s) => s.locale)
  const switchLanguage = useLanguageStore((s) => s.switchLanguage)

  async function handleSelect(code: Locale) {
    if (code === locale) {
      onClose()
      return
    }
    onClose()
    await switchLanguage(code)
    // Brief delay lets the modal close animation finish before reloading.
    setTimeout(reloadApp, 150)
  }

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
        <Text style={styles.sheetTitle}>Language / اللغة</Text>

        {OPTIONS.map((opt) => {
          const active = opt.code === locale
          return (
            <Pressable
              key={opt.code}
              onPress={() => handleSelect(opt.code)}
              style={({ pressed }) => [
                styles.optionRow,
                active && styles.optionRowActive,
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={styles.optionFlag}>{opt.flag}</Text>
              <View style={styles.optionLabels}>
                <Text style={[styles.optionNative, active && styles.optionNativeActive]}>
                  {opt.nativeLabel}
                </Text>
                <Text style={[styles.optionEnglish, active && styles.optionEnglishActive]}>
                  {opt.label}
                </Text>
              </View>
              {active && <Text style={styles.checkmark}>✓</Text>}
            </Pressable>
          )
        })}

        <Pressable onPress={onClose} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel / إلغاء</Text>
        </Pressable>
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
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: tokens.colors.border,
    alignSelf: 'center',
    marginBottom: tokens.spacing.md,
  },
  sheetTitle: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
    textAlign: 'center',
    marginBottom: tokens.spacing.lg,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    marginBottom: tokens.spacing.sm,
    borderWidth: 1.5,
    borderColor: tokens.colors.border,
    gap: tokens.spacing.md,
  },
  optionRowActive: {
    backgroundColor: tokens.colors.primary + '15',
    borderColor: tokens.colors.primary,
  },
  optionFlag: {
    fontSize: 28,
  },
  optionLabels: {
    flex: 1,
  },
  optionNative: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.text,
  },
  optionNativeActive: {
    color: tokens.colors.primary,
    fontWeight: tokens.fontWeight.bold,
  },
  optionEnglish: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textMuted,
    marginTop: 2,
  },
  optionEnglishActive: {
    color: tokens.colors.primaryDark,
  },
  checkmark: {
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.primary,
  },
  cancelBtn: {
    marginTop: tokens.spacing.sm,
    alignItems: 'center',
    paddingVertical: tokens.spacing.md,
  },
  cancelText: {
    fontSize: tokens.fontSize.base,
    color: tokens.colors.textMuted,
  },
})
