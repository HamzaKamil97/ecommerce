import React from 'react'
import { View, Text, Pressable, StyleSheet, Alert, SafeAreaView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { tokens } from '@/src/theme/tokens'
import { t } from '@/src/i18n'
import { useLanguageStore } from '@/src/store/languageStore'
import { useChromeStore } from '@/src/store/chromeStore'

interface Props {
  icon: React.ComponentProps<typeof Ionicons>['name']
  title: string
  subtitle?: string
}

export function ComingSoon({ icon, title, subtitle }: Props) {
  useLanguageStore((s) => s.locale)

  // Every Coming-Soon locked screen should hide the Najma FAB so it doesn't
  // visually compete with the notify CTA.
  React.useEffect(() => {
    useChromeStore.getState().setNajmaFabHidden(true)
    return () => useChromeStore.getState().setNajmaFabHidden(false)
  }, [])

  function onNotify() {
    Alert.alert(t('comingSoon.notifyAck'))
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.body}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={56} color={tokens.colors.primary} />
        </View>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <Pressable
          onPress={onNotify}
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.btnText}>{t('comingSoon.notifyMe')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.spacing.xl,
    gap: tokens.spacing.md,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: tokens.colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.md,
  },
  title: {
    fontSize: tokens.fontSize.xl,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: tokens.fontSize.base,
    color: tokens.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: tokens.spacing.md,
  },
  btn: {
    marginTop: tokens.spacing.lg,
    paddingHorizontal: tokens.spacing.xl,
    height: 48,
    minWidth: 200,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.white,
  },
})
