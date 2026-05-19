import React, { useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import { tokens } from '@/src/theme/tokens'

interface ToastJob {
  message: string
  duration?: number
}

let triggerRef: ((job: ToastJob) => void) | null = null

export function showToast(job: ToastJob) {
  if (triggerRef) triggerRef(job)
}

export function ToastHost() {
  const [message, setMessage] = useState<string | null>(null)
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(20)).current
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    triggerRef = ({ message: m, duration = 1500 }: ToastJob) => {
      if (timer.current) clearTimeout(timer.current)
      setMessage(m)
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start()
      timer.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 20, duration: 220, useNativeDriver: true }),
        ]).start(() => setMessage(null))
      }, duration)
    }
    return () => {
      triggerRef = null
      if (timer.current) clearTimeout(timer.current)
    }
  }, [opacity, translateY])

  if (!message) return null
  return (
    <View pointerEvents="none" style={styles.host}>
      <Animated.View style={[styles.toast, { opacity, transform: [{ translateY }] }]}>
        <Text style={styles.text}>{message}</Text>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 120,
    alignItems: 'center',
    zIndex: 10000,
  },
  toast: {
    backgroundColor: 'rgba(11,11,15,0.92)',
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.pill,
    ...tokens.shadow.floating,
  },
  text: {
    color: tokens.colors.white,
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.semibold,
  },
})
