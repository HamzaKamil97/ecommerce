import React, { useEffect, useRef, useState } from 'react'
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { tokens } from '@/src/theme/tokens'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

interface Props {
  qty: number
  onIncrement: () => void
  onDecrement: () => void
  onAdd: () => void
  size?: 'sm' | 'md'
  /** Time in ms before collapsing back to the numbered pill */
  collapseAfter?: number
}

type Mode = 'idle' | 'expanded' | 'collapsed'

export function QuantityStepper({
  qty,
  onIncrement,
  onDecrement,
  onAdd,
  size = 'sm',
  collapseAfter = 3000,
}: Props) {
  const [mode, setMode] = useState<Mode>(qty > 0 ? 'collapsed' : 'idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dims = size === 'md' ? DIMS.md : DIMS.sm

  useEffect(() => {
    if (qty === 0) {
      if (timer.current) clearTimeout(timer.current)
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
      setMode('idle')
    }
  }, [qty])

  function bump() {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
      setMode('collapsed')
    }, collapseAfter)
  }

  function handleAdd(e: any) {
    e.stopPropagation?.()
    onAdd()
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setMode('expanded')
    bump()
  }

  function handleInc(e: any) {
    e.stopPropagation?.()
    onIncrement()
    bump()
  }

  function handleDec(e: any) {
    e.stopPropagation?.()
    onDecrement()
    bump()
  }

  function handleExpand(e: any) {
    e.stopPropagation?.()
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setMode('expanded')
    bump()
  }

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  // Idle: single + button
  if (mode === 'idle' || qty === 0) {
    return (
      <Pressable
        onPress={handleAdd}
        hitSlop={6}
        style={({ pressed }) => [
          styles.base,
          { width: dims.h, height: dims.h, borderRadius: dims.h / 2 },
          styles.primary,
          pressed && styles.pressed,
        ]}
        accessibilityLabel="Add to cart"
      >
        <Ionicons name="add" size={dims.icon} color={tokens.colors.white} />
      </Pressable>
    )
  }

  // Collapsed: tiny pill showing qty
  if (mode === 'collapsed') {
    return (
      <Pressable
        onPress={handleExpand}
        hitSlop={6}
        style={({ pressed }) => [
          styles.base,
          { minWidth: dims.h, height: dims.h, borderRadius: dims.h / 2, paddingHorizontal: tokens.spacing.sm },
          styles.primary,
          pressed && styles.pressed,
        ]}
        accessibilityLabel={`In cart: ${qty}`}
      >
        <Text style={[styles.qtyText, { fontSize: dims.qty }]}>{qty}</Text>
      </Pressable>
    )
  }

  // Expanded: [-] qty [+]
  return (
    <View
      style={[
        styles.expandedWrap,
        { height: dims.h, borderRadius: dims.h / 2 },
      ]}
    >
      <Pressable
        onPress={handleDec}
        hitSlop={6}
        style={({ pressed }) => [
          styles.stepBtn,
          { width: dims.h, height: dims.h, borderRadius: dims.h / 2 },
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="remove" size={dims.icon} color={tokens.colors.white} />
      </Pressable>
      <Text style={[styles.qtyTextExpanded, { fontSize: dims.qty }]}>{qty}</Text>
      <Pressable
        onPress={handleInc}
        hitSlop={6}
        style={({ pressed }) => [
          styles.stepBtn,
          { width: dims.h, height: dims.h, borderRadius: dims.h / 2 },
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="add" size={dims.icon} color={tokens.colors.white} />
      </Pressable>
    </View>
  )
}

const DIMS = {
  sm: { h: 32, icon: 18, qty: 14 },
  md: { h: 40, icon: 22, qty: 16 },
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.floating,
  },
  primary: {
    backgroundColor: tokens.colors.primary,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  expandedWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: tokens.colors.primary,
    paddingHorizontal: 2,
    ...tokens.shadow.floating,
  },
  stepBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    color: tokens.colors.white,
    fontWeight: tokens.fontWeight.bold,
    minWidth: 14,
    textAlign: 'center',
  },
  qtyTextExpanded: {
    color: tokens.colors.white,
    fontWeight: tokens.fontWeight.bold,
    minWidth: 18,
    textAlign: 'center',
    paddingHorizontal: tokens.spacing.xs,
  },
})
