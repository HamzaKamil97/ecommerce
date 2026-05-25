import React, { useRef, useState } from 'react'
import { SafeAreaView, View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native'
import { useRouter, Stack } from 'expo-router'
import { tokens } from '@/src/theme/tokens'
import { t } from '@/src/i18n'
import { useLanguageStore } from '@/src/store/languageStore'

type PhraseKey =
  | 'games.soukWheel.phrase1'
  | 'games.soukWheel.phrase2'
  | 'games.soukWheel.phrase3'
  | 'games.soukWheel.phrase4'
  | 'games.soukWheel.phrase5'
  | 'games.soukWheel.phrase6'
  | 'games.soukWheel.phrase7'
  | 'games.soukWheel.phrase8'

const PHRASE_KEYS: PhraseKey[] = [
  'games.soukWheel.phrase1',
  'games.soukWheel.phrase2',
  'games.soukWheel.phrase3',
  'games.soukWheel.phrase4',
  'games.soukWheel.phrase5',
  'games.soukWheel.phrase6',
  'games.soukWheel.phrase7',
  'games.soukWheel.phrase8',
]

const SEGMENT_COLORS = [
  tokens.colors.primary,
  tokens.colors.accentSoft,
  tokens.colors.primaryDark,
  tokens.colors.surface,
  tokens.colors.primary,
  tokens.colors.accentSoft,
  tokens.colors.primaryDark,
  tokens.colors.surface,
]

const WHEEL_SIZE = 280
const SEGMENT_COUNT = 8
const SEGMENT_DEG = 360 / SEGMENT_COUNT

export default function SoukWheelScreen() {
  useLanguageStore((s) => s.locale)
  const router = useRouter()
  const rotation = useRef(new Animated.Value(0)).current
  const totalRotation = useRef(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<PhraseKey | null>(null)

  function spin() {
    if (spinning) return
    setResult(null)
    setSpinning(true)
    const segmentIndex = Math.floor(Math.random() * SEGMENT_COUNT)
    // Final orientation: pointer is at top (0°). We want the centre of the
    // chosen segment to land at 0 from the wheel's frame: add 4 full turns
    // + an offset that places the segment under the pointer.
    const offset = -(segmentIndex * SEGMENT_DEG) - SEGMENT_DEG / 2
    const target = totalRotation.current + 360 * 4 + offset - (totalRotation.current % 360)
    totalRotation.current = target

    Animated.timing(rotation, {
      toValue: target,
      duration: 2400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setSpinning(false)
      setResult(PHRASE_KEYS[segmentIndex])
    })
  }

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  })

  return (
    <SafeAreaView style={styles.root}>
      <Stack.Screen options={{ title: t('games.soukWheel.name') }} />
      <View style={styles.body}>
        <Text style={styles.tagline}>{t('games.soukWheel.tagline')}</Text>

        <View style={styles.wheelWrap}>
          <View style={styles.pointer} />
          <Animated.View
            style={[
              styles.wheel,
              { transform: [{ rotate: rotateInterpolate }] },
            ]}
          >
            {PHRASE_KEYS.map((key, i) => {
              const rotateSeg = `${i * SEGMENT_DEG + SEGMENT_DEG / 2}deg`
              return (
                <View
                  key={i}
                  style={[
                    styles.segmentSlice,
                    {
                      transform: [{ rotate: rotateSeg }],
                    },
                  ]}
                  pointerEvents="none"
                >
                  <View style={[styles.segmentBar, { backgroundColor: SEGMENT_COLORS[i] }]} />
                  <Text style={styles.segmentLabel} numberOfLines={1}>
                    {t(key)}
                  </Text>
                </View>
              )
            })}
            <View style={styles.hub} />
          </Animated.View>
        </View>

        {result ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultText}>{t(result)}</Text>
            <View style={styles.actionRow}>
              <Pressable
                onPress={spin}
                style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.btnPrimaryText}>{t('games.soukWheel.spinAgain')}</Text>
              </Pressable>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [styles.btn, styles.btnSecondary, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.btnSecondaryText}>{t('games.soukWheel.back')}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={spin}
            disabled={spinning}
            style={({ pressed }) => [
              styles.spinBtn,
              spinning && styles.spinBtnDisabled,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.spinBtnText}>
              {spinning ? '…' : t('games.soukWheel.spin')}
            </Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: tokens.colors.bg },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.lg,
    gap: tokens.spacing.xl,
  },
  tagline: { fontSize: tokens.fontSize.base, color: tokens.colors.textMuted, textAlign: 'center' },
  wheelWrap: { width: WHEEL_SIZE, height: WHEEL_SIZE + 24, alignItems: 'center' },
  pointer: {
    width: 0, height: 0,
    borderLeftWidth: 12, borderRightWidth: 12, borderTopWidth: 22,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: tokens.colors.danger,
    zIndex: 10, marginBottom: -8,
  },
  wheel: {
    width: WHEEL_SIZE, height: WHEEL_SIZE, borderRadius: WHEEL_SIZE / 2,
    backgroundColor: tokens.colors.surface,
    borderWidth: 4, borderColor: tokens.colors.primary,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
  },
  segmentSlice: {
    position: 'absolute', top: 0, left: 0,
    width: WHEEL_SIZE, height: WHEEL_SIZE, alignItems: 'center',
  },
  segmentBar: {
    position: 'absolute', top: 8, width: 22,
    height: WHEEL_SIZE / 2 - 22, borderRadius: 4,
  },
  segmentLabel: {
    position: 'absolute', top: WHEEL_SIZE / 2 - 60,
    fontSize: tokens.fontSize.xs, fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text, maxWidth: 80, textAlign: 'center',
  },
  hub: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: tokens.colors.surface,
    borderWidth: 3, borderColor: tokens.colors.primary, zIndex: 5,
  },
  spinBtn: {
    paddingHorizontal: tokens.spacing.xxl, height: 56, minWidth: 200,
    borderRadius: tokens.radius.pill, backgroundColor: tokens.colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  spinBtnDisabled: { opacity: 0.6 },
  spinBtnText: {
    fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.white,
  },
  resultCard: {
    backgroundColor: tokens.colors.accentSoft, borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg, alignItems: 'center',
    gap: tokens.spacing.md, alignSelf: 'stretch',
  },
  resultText: {
    fontSize: tokens.fontSize.xl, fontWeight: tokens.fontWeight.extrabold,
    color: tokens.colors.text, textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row', gap: tokens.spacing.sm,
    alignSelf: 'stretch', justifyContent: 'center',
  },
  btn: {
    paddingHorizontal: tokens.spacing.lg, height: 44,
    borderRadius: tokens.radius.pill, alignItems: 'center', justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: tokens.colors.primary },
  btnPrimaryText: {
    fontSize: tokens.fontSize.base, fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.white,
  },
  btnSecondary: { borderWidth: 1.5, borderColor: tokens.colors.primary },
  btnSecondaryText: {
    fontSize: tokens.fontSize.base, fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.primary,
  },
})
