import React, { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Animated } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { tokens } from '@/src/theme/tokens'
import { useChromeStore } from '@/src/store/chromeStore'
import { NajmaSheet } from './NajmaSheet'

export function NajmaFab() {
  const hidden = useChromeStore((s) => s.najmaFabHidden)
  const [open, setOpen] = useState(false)
  const scale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const pulse = Animated.sequence([
      Animated.timing(scale, { toValue: 1.08, duration: 380, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1.08, duration: 380, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 380, useNativeDriver: true }),
    ])
    pulse.start()
  }, [scale])

  if (hidden) return null

  return (
    <>
      <Animated.View style={[styles.wrap, { transform: [{ scale }] }]} pointerEvents="box-none">
        <Pressable
          onPress={() => setOpen(true)}
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          hitSlop={8}
        >
          <Ionicons name="star" size={26} color={tokens.colors.white} />
        </Pressable>
      </Animated.View>
      <NajmaSheet visible={open} onClose={() => setOpen(false)} />
    </>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: tokens.spacing.lg,
    bottom: 92,
    zIndex: 50,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: tokens.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.floating,
  },
  fabPressed: {
    opacity: 0.85,
  },
})
