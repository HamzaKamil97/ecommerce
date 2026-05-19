import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { tokens } from '@/src/theme/tokens'
import { t } from '@/src/i18n'

interface Props {
  label?: string
  size?: 'sm' | 'md'
}

export function PromotedPill({ label, size = 'sm' }: Props) {
  const text = label ?? t('promoted.label')
  const dims = size === 'md' ? STYLE.md : STYLE.sm
  return (
    <View style={[styles.pill, dims.pill]}>
      <Text style={[styles.label, dims.label]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  )
}

const STYLE = {
  sm: {
    pill: { paddingHorizontal: 6, paddingVertical: 2 },
    label: { fontSize: 10 },
  },
  md: {
    pill: { paddingHorizontal: tokens.spacing.sm, paddingVertical: 3 },
    label: { fontSize: tokens.fontSize.xs },
  },
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: tokens.colors.accent,
    borderRadius: tokens.radius.pill,
    alignSelf: 'flex-start',
  },
  label: {
    color: tokens.colors.white,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: 0.3,
  },
})
