import React from 'react'
import { View, TextInput, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { tokens } from '@/src/theme/tokens'
import { t } from '@/src/i18n'

interface Props {
  shopName: string
  value: string
  onChangeText: (s: string) => void
}

export function ShopSearchBox({ shopName, value, onChangeText }: Props) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <Ionicons name="search" size={18} color={tokens.colors.textMuted} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={t('shop.searchIn', { shopName })}
          placeholderTextColor={tokens.colors.textMuted}
          style={styles.input}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          numberOfLines={1}
          multiline={false}
        />
        {value.length > 0 ? (
          <Pressable
            onPress={() => onChangeText('')}
            hitSlop={8}
            accessibilityLabel={t('shop.searchClear')}
          >
            <Ionicons name="close-circle" size={18} color={tokens.colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    backgroundColor: tokens.colors.bg,
  },
  container: {
    height: 48,
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
    gap: tokens.spacing.sm,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  input: {
    flex: 1,
    height: 46,
    fontSize: tokens.fontSize.base,
    color: tokens.colors.text,
    padding: 0,
  },
})
