import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { tokens } from '@/src/theme/tokens'

interface Props {
  location?: string
  cartCount?: number
  onCart: () => void
  onNotifications?: () => void
}

export function TopBar({ location = 'Deliver to · Baghdad', cartCount = 0, onCart, onNotifications }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.locationRow}>
        <Text style={styles.pin}>📍</Text>
        <Text style={styles.locationText} numberOfLines={1}>{location}</Text>
      </View>
      <View style={styles.actions}>
        {onNotifications && (
          <Pressable onPress={onNotifications} style={styles.iconBtn} hitSlop={8}>
            <Text style={styles.iconEmoji}>🔔</Text>
          </Pressable>
        )}
        <Pressable onPress={onCart} style={styles.iconBtn} hitSlop={8}>
          <Text style={styles.iconEmoji}>🛒</Text>
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
    backgroundColor: tokens.colors.bg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
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
    color: tokens.colors.text,
    flex: 1,
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
