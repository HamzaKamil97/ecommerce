import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { tokens } from '@/src/theme/tokens'

interface Props {
  icon?: string
  headline: string
  subtext?: string
  bg?: 'teal' | 'saffron'
}

export function PromoStrip({ icon = '🚚', headline, subtext, bg = 'saffron' }: Props) {
  const bgColor = bg === 'teal' ? tokens.colors.primary : tokens.colors.accent
  const textColor = bg === 'teal' ? tokens.colors.white : tokens.colors.text

  return (
    <View style={[styles.strip, { backgroundColor: bgColor }]}>
      <Text style={styles.iconText}>{icon}</Text>
      <View style={styles.textBlock}>
        <Text style={[styles.headline, { color: textColor }]}>{headline}</Text>
        {subtext && (
          <Text style={[styles.subtext, { color: bg === 'teal' ? 'rgba(255,255,255,0.8)' : tokens.colors.textMuted }]}>
            {subtext}
          </Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  strip: {
    marginHorizontal: tokens.spacing.lg,
    marginVertical: tokens.spacing.sm,
    height: 72,
    borderRadius: tokens.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.lg,
    gap: tokens.spacing.md,
    ...tokens.shadow.card,
  },
  iconText: {
    fontSize: 28,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  headline: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.bold,
  },
  subtext: {
    fontSize: tokens.fontSize.sm,
  },
})
