import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { tokens } from '@/src/theme/tokens'
import { t } from '@/src/i18n'
import { useLanguageStore } from '@/src/store/languageStore'

interface Props {
  size?: 'sm' | 'md'
}

export function HanootSelectBadge({ size = 'sm' }: Props) {
  useLanguageStore((s) => s.locale)
  const isMd = size === 'md'
  return (
    <View style={[styles.pill, isMd ? styles.pillMd : null]}>
      <Ionicons name="star" size={10} color={tokens.colors.white} />
      <Text style={styles.text}>{t('shop.hanootSelect')}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radius.pill,
    paddingVertical: 3,
    paddingHorizontal: tokens.spacing.sm,
    alignSelf: 'flex-start',
  },
  pillMd: {
    paddingVertical: 5,
    paddingHorizontal: tokens.spacing.md,
  },
  text: {
    fontFamily: tokens.fontFamily.bold,
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.white,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
})
