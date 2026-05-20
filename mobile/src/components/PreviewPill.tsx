import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { tokens } from '@/src/theme/tokens'
import { t } from '@/src/i18n'

interface Props {
  size?: 'sm' | 'md'
  tone?: 'accent' | 'white'
}

export function PreviewPill({ size = 'md', tone = 'accent' }: Props) {
  const isSm = size === 'sm'
  const isWhite = tone === 'white'

  return (
    <View
      accessibilityLabel={t('preview.aiDisclaimer')}
      style={[
        styles.pill,
        isSm && styles.pillSm,
        isWhite ? styles.pillWhite : styles.pillAccent,
      ]}
    >
      <Text style={[styles.text, isSm && styles.textSm, isWhite ? styles.textWhite : styles.textAccent]}>
        {t('preview.label')}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 3,
    borderRadius: tokens.radius.pill,
    alignSelf: 'flex-start',
  },
  pillSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pillAccent: {
    backgroundColor: tokens.colors.accent + '22',
    borderWidth: 1,
    borderColor: tokens.colors.accent,
  },
  pillWhite: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  text: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: 0.3,
  },
  textSm: {
    fontSize: 10,
  },
  textAccent: {
    color: tokens.colors.accentDark,
  },
  textWhite: {
    color: tokens.colors.white,
  },
})
