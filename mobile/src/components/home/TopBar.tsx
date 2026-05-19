import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { tokens } from '@/src/theme/tokens'

interface Props {
  location?: string
  cartCount?: number
  tone?: 'light' | 'dark'
  onCart: () => void
  onLocation?: () => void
  onNotifications?: () => void
}

export function TopBar({
  location = 'Deliver to · Baghdad',
  cartCount = 0,
  tone = 'dark',
  onCart,
  onLocation,
  onNotifications,
}: Props) {
  const textColor = tone === 'light' ? tokens.colors.white : tokens.colors.text
  const iconColor = tone === 'light' ? tokens.colors.white : tokens.colors.text

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onLocation}
        style={({ pressed }) => [styles.locationRow, { opacity: pressed ? 0.75 : 1 }]}
      >
        <Ionicons name="location-outline" size={20} color={iconColor} />
        <Text style={[styles.locationText, { color: textColor }]} numberOfLines={1}>
          {location}
        </Text>
        <Ionicons name="chevron-down" size={16} color={textColor} />
      </Pressable>
      <View style={styles.actions}>
        {onNotifications && (
          <Pressable onPress={onNotifications} style={styles.iconBtn} hitSlop={8}>
            <Ionicons name="notifications-outline" size={22} color={iconColor} />
          </Pressable>
        )}
        <Pressable onPress={onCart} style={styles.iconBtn} hitSlop={8}>
          <Ionicons name="bag-outline" size={22} color={iconColor} />
          {cartCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{cartCount > 99 ? '99+' : String(cartCount)}</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.lg,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: tokens.spacing.xs,
  },
  pin: {
    fontSize: 16,
  },
  locationText: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.semibold,
    flex: 1,
  },
  chevron: {
    fontSize: 14,
    marginLeft: tokens.spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconEmoji: {
    fontSize: 22,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: tokens.colors.accent,
    borderRadius: tokens.radius.pill,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.white,
  },
})
