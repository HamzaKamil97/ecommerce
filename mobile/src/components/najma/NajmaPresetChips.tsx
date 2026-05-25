import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { tokens } from '@/src/theme/tokens'
import { t } from '@/src/i18n'

type PresetKey =
  | 'najma.preset.findCheaper'
  | 'najma.preset.itemNotListed'
  | 'najma.preset.compareShops'
  | 'najma.preset.bundleDeal'

interface Preset {
  key: PresetKey
  icon: React.ComponentProps<typeof Ionicons>['name']
}

const PRESETS: Preset[] = [
  { key: 'najma.preset.findCheaper', icon: 'pricetag' },
  { key: 'najma.preset.itemNotListed', icon: 'search' },
  { key: 'najma.preset.compareShops', icon: 'git-compare' },
  { key: 'najma.preset.bundleDeal', icon: 'cube-outline' },
]

interface Props {
  onPick: (text: string) => void
}

export function NajmaPresetChips({ onPick }: Props) {
  return (
    <View style={styles.grid}>
      {PRESETS.map((p) => {
        const label = t(p.key)
        return (
          <Pressable
            key={p.key}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => onPick(label)}
          >
            <Ionicons name={p.icon} size={20} color={tokens.colors.primary} />
            <Text style={styles.label}>{label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.sm,
  },
  card: {
    width: '48%',
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.md,
    gap: tokens.spacing.xs,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  cardPressed: {
    backgroundColor: tokens.colors.surfaceAlt,
  },
  label: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.text,
  },
})
