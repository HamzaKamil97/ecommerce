import React, { useEffect, useState } from 'react'
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
import { tokens } from '@/src/theme/tokens'
import { t } from '@/src/i18n'
import { useLanguageStore } from '@/src/store/languageStore'
import { showToast } from '@/src/components/Toast'

type Tier = 'dhahab' | 'khass'

interface Props {
  visible: boolean
  tier: Tier | null
  onClose: () => void
}

const PERK_KEYS: Record<Tier, [string, string, string]> = {
  dhahab: ['pass.dhahab.perk1', 'pass.dhahab.perk2', 'pass.dhahab.perk3'],
  khass: ['pass.khass.perk1', 'pass.khass.perk2', 'pass.khass.perk3'],
}

const NAME_KEY: Record<Tier, 'pass.dhahab.name' | 'pass.khass.name'> = {
  dhahab: 'pass.dhahab.name',
  khass: 'pass.khass.name',
}

const TAGLINE_KEY: Record<Tier, 'pass.dhahab.tagline' | 'pass.khass.tagline'> = {
  dhahab: 'pass.dhahab.tagline',
  khass: 'pass.khass.tagline',
}

const PRICE_AMOUNT: Record<Tier, string> = {
  dhahab: '15,000',
  khass: '39,000',
}

export function PassTierSheet({ visible, tier, onClose }: Props) {
  useLanguageStore((s) => s.locale)
  const [email, setEmail] = useState('')

  useEffect(() => {
    if (!visible) setEmail('')
  }, [visible])

  if (!tier) {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <Pressable style={styles.backdrop} onPress={onClose} />
      </Modal>
    )
  }

  const handleNotify = () => {
    showToast({ message: t('pass.notifyAck') })
    onClose()
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
          <Text style={styles.tierName}>
            {t('pass.title')} · {t(NAME_KEY[tier])}
          </Text>
          <Text style={styles.tagline}>{t(TAGLINE_KEY[tier])}</Text>
          <Text style={styles.price}>
            {t('pass.pricePerMonth', { amount: PRICE_AMOUNT[tier] })}
          </Text>

          <View style={styles.perksList}>
            {PERK_KEYS[tier].map((key) => (
              <View key={key} style={styles.perkRow}>
                <Text style={styles.perkBullet}>✦</Text>
                <Text style={styles.perkText}>{t(key as 'pass.dhahab.perk1')}</Text>
              </View>
            ))}
          </View>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={t('pass.notifyEmailPlaceholder')}
            placeholderTextColor={tokens.colors.textMuted}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Pressable
            onPress={handleNotify}
            style={({ pressed }) => [styles.notifyBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.notifyText}>{t('pass.notifyMe')}</Text>
          </Pressable>

          <Pressable onPress={onClose} style={styles.continueBtn}>
            <Text style={styles.continueText}>{t('pass.continueBrowsing')}</Text>
          </Pressable>
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
  tierName: {
    fontSize: tokens.fontSize.xl,
    fontFamily: tokens.fontFamily.display,
    fontWeight: tokens.fontWeight.extrabold,
    color: tokens.colors.text,
  },
  tagline: {
    fontSize: tokens.fontSize.base,
    fontFamily: tokens.fontFamily.body,
    color: tokens.colors.textMuted,
    marginTop: 2,
  },
  price: {
    fontSize: tokens.fontSize.lg,
    fontFamily: tokens.fontFamily.monoBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.primary,
    marginTop: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
  },
  perksList: {
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.lg,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.spacing.sm,
  },
  perkBullet: {
    fontSize: tokens.fontSize.base,
    color: tokens.colors.primary,
    lineHeight: 20,
  },
  perkText: {
    flex: 1,
    fontSize: tokens.fontSize.base,
    fontFamily: tokens.fontFamily.body,
    color: tokens.colors.text,
    lineHeight: 20,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.md,
    fontSize: tokens.fontSize.base,
    color: tokens.colors.text,
    backgroundColor: tokens.colors.surface,
    marginBottom: tokens.spacing.sm,
  },
  notifyBtn: {
    height: 52,
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifyText: {
    fontSize: tokens.fontSize.base,
    fontFamily: tokens.fontFamily.bold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.white,
  },
  continueBtn: {
    marginTop: tokens.spacing.sm,
    alignItems: 'center',
    paddingVertical: tokens.spacing.sm,
  },
  continueText: {
    fontSize: tokens.fontSize.base,
    fontFamily: tokens.fontFamily.body,
    color: tokens.colors.textMuted,
  },
})
