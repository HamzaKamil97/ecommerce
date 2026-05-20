import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { tokens } from '@/src/theme/tokens'

interface Props {
  icon: React.ComponentProps<typeof Ionicons>['name']
  label: string
  value?: string
  onPress: () => void
  danger?: boolean
}

export function MenuRow({ icon, label, value, onPress, danger }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.8 : 1 }]}
    >
      <View style={styles.iconWrap}>
        <Ionicons
          name={icon}
          size={20}
          color={danger ? tokens.colors.danger : tokens.colors.text}
        />
      </View>
      <Text style={[styles.label, danger && styles.labelDanger]}>{label}</Text>
      {value ? <Text style={styles.value}>{value}</Text> : null}
      {!danger && <Text style={styles.chevron}>›</Text>}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.lg,
    height: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.border,
    backgroundColor: tokens.colors.bg,
    gap: tokens.spacing.md,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: tokens.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.text,
  },
  labelDanger: {
    color: tokens.colors.danger,
  },
  value: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textMuted,
    marginRight: tokens.spacing.xs,
  },
  chevron: {
    fontSize: 20,
    color: tokens.colors.textMuted,
  },
})
