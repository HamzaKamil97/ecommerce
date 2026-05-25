import React, { useCallback, useRef, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Image,
  Linking,
  SafeAreaView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { CameraView, useCameraPermissions, type CameraView as CameraViewType } from 'expo-camera'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { tokens } from '@/src/theme/tokens'
import { t } from '@/src/i18n'
import { useLanguageStore } from '@/src/store/languageStore'
import { najmaVision, type VisionMode, type VisionResponse } from '@/src/lib/najma/vision'
import { CameraResultSheet } from '@/src/components/najma/CameraResultSheet'
import { styles } from '@/src/components/najma/cameraStyles'

type Stage = 'mode-select' | 'camera' | 'preview' | 'thinking' | 'result' | 'error'

interface ModeTile {
  mode: VisionMode
  titleKey: 'najma.vision.mode.fridge' | 'najma.vision.mode.receipt' | 'najma.vision.mode.photo'
  subKey: 'najma.vision.mode.fridgeSub' | 'najma.vision.mode.receiptSub' | 'najma.vision.mode.photoSub'
  icon: keyof typeof Ionicons.glyphMap
}

const MODES: ModeTile[] = [
  { mode: 'fridge', titleKey: 'najma.vision.mode.fridge', subKey: 'najma.vision.mode.fridgeSub', icon: 'cube' },
  { mode: 'receipt', titleKey: 'najma.vision.mode.receipt', subKey: 'najma.vision.mode.receiptSub', icon: 'receipt' },
  { mode: 'photo', titleKey: 'najma.vision.mode.photo', subKey: 'najma.vision.mode.photoSub', icon: 'search' },
]

export default function NajmaCameraScreen() {
  // Re-render on locale change so all t() calls reflect EN/AR.
  useLanguageStore((s) => s.locale)
  const router = useRouter()
  const [permission, requestPermission] = useCameraPermissions()
  const cameraRef = useRef<CameraViewType | null>(null)

  const [stage, setStage] = useState<Stage>('mode-select')
  const [mode, setMode] = useState<VisionMode | null>(null)
  const [previewUri, setPreviewUri] = useState<string | null>(null)
  const [capturedB64, setCapturedB64] = useState<string | null>(null)
  const [result, setResult] = useState<VisionResponse | null>(null)
  const [noKey, setNoKey] = useState(false)

  const goBack = () => {
    if (router.canGoBack()) router.back()
    else router.replace('/(tabs)')
  }

  const handlePickMode = useCallback(
    async (m: VisionMode) => {
      Haptics.selectionAsync().catch(() => {})
      setMode(m)
      // If permission not yet granted, request it now.
      if (!permission?.granted) {
        const next = await requestPermission()
        if (!next.granted) {
          // Stay in mode-select; permDenied UI will be shown via permission state
          return
        }
      }
      setStage('camera')
    },
    [permission?.granted, requestPermission],
  )

  const handleShutter = useCallback(async () => {
    if (!cameraRef.current) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
    try {
      const pic = await cameraRef.current.takePictureAsync({ quality: 0.6, base64: true })
      if (!pic?.base64) {
        setStage('error')
        return
      }
      setPreviewUri(pic.uri)
      setCapturedB64(pic.base64)
      setStage('preview')
    } catch {
      setStage('error')
    }
  }, [])

  const handleAsk = useCallback(async () => {
    if (!mode || !capturedB64) return
    setStage('thinking')
    const r = await najmaVision({ mode, imageBase64: capturedB64 })
    if (r.ok) {
      setResult(r)
      setStage('result')
    } else if (r.error === 'no-key') {
      setNoKey(true)
      setStage('mode-select')
      setMode(null)
      setPreviewUri(null)
      setCapturedB64(null)
    } else {
      setResult(r)
      setStage('error')
    }
  }, [mode, capturedB64])

  const handleRetake = () => {
    setPreviewUri(null)
    setCapturedB64(null)
    setStage('camera')
  }

  const handleSnapAgain = () => {
    setResult(null)
    setPreviewUri(null)
    setCapturedB64(null)
    setStage('camera')
  }

  const handleDone = () => {
    goBack()
  }

  // -------------- Launching-soon overlay (key missing) --------------
  if (noKey) {
    return (
      <SafeAreaView style={styles.fullCenter}>
        <Header title={t('najma.vision.title')} onBack={goBack} />
        <View style={styles.launchingCard}>
          <Ionicons name="sparkles" size={32} color={tokens.colors.primary} />
          <Text style={styles.launchingTitle}>{t('najma.vision.launchingSoon')}</Text>
          <Text style={styles.launchingSub}>{t('najma.vision.launchingSoonSub')}</Text>
        </View>
      </SafeAreaView>
    )
  }

  // -------------- Permission denied --------------
  if (mode && permission && !permission.granted && stage !== 'mode-select') {
    return (
      <SafeAreaView style={styles.fullCenter}>
        <Header title={t('najma.vision.title')} onBack={goBack} />
        <View style={styles.launchingCard}>
          <Ionicons name="camera-outline" size={32} color={tokens.colors.primary} />
          <Text style={styles.launchingTitle}>{t('najma.vision.permDenied')}</Text>
          <Pressable
            style={({ pressed }) => [styles.allowBtn, pressed && styles.btnPressed]}
            onPress={() => {
              if (permission.canAskAgain) requestPermission()
              else Linking.openSettings().catch(() => {})
            }}
          >
            <Text style={styles.allowBtnText}>{t('najma.vision.permRetry')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  // -------------- Mode select --------------
  if (stage === 'mode-select') {
    return (
      <SafeAreaView style={styles.screen}>
        <Header title={t('najma.vision.title')} onBack={goBack} />
        <View style={styles.modeList}>
          {MODES.map((m) => (
            <Pressable
              key={m.mode}
              onPress={() => handlePickMode(m.mode)}
              style={({ pressed }) => [styles.modeTile, pressed && styles.btnPressed]}
            >
              <View style={styles.modeIcon}>
                <Ionicons name={m.icon} size={24} color={tokens.colors.primary} />
              </View>
              <View style={styles.modeBody}>
                <Text style={styles.modeTitle}>{t(m.titleKey)}</Text>
                <Text style={styles.modeSub}>{t(m.subKey)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={tokens.colors.textMuted} />
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    )
  }

  // -------------- Result --------------
  if (stage === 'result' && result) {
    return (
      <SafeAreaView style={styles.screen}>
        <Header title={t('najma.vision.title')} onBack={goBack} />
        <CameraResultSheet result={result} onSnapAgain={handleSnapAgain} onDone={handleDone} />
      </SafeAreaView>
    )
  }

  // -------------- Preview + Ask Najma --------------
  if (stage === 'preview' && previewUri) {
    return (
      <SafeAreaView style={styles.screenDark}>
        <Header title={t('najma.vision.title')} onBack={goBack} dark />
        <View style={styles.previewWrap}>
          <Image source={{ uri: previewUri }} style={styles.previewImg} resizeMode="cover" />
        </View>
        <View style={styles.previewActions}>
          <Pressable
            onPress={handleRetake}
            style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && styles.btnPressed]}
          >
            <Ionicons name="refresh" size={16} color={tokens.colors.text} />
            <Text style={styles.btnGhostText}>{t('najma.vision.preview.retake')}</Text>
          </Pressable>
          <Pressable
            onPress={handleAsk}
            style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.btnPressed]}
          >
            <Ionicons name="star" size={16} color={tokens.colors.white} />
            <Text style={styles.btnPrimaryText}>{t('najma.vision.preview.ask')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  // -------------- Thinking --------------
  if (stage === 'thinking') {
    return (
      <SafeAreaView style={styles.fullCenter}>
        <Header title={t('najma.vision.title')} onBack={goBack} />
        <View style={styles.thinkingWrap}>
          <ActivityIndicator size="large" color={tokens.colors.primary} />
          <Text style={styles.thinkingText}>{t('najma.thinking')}</Text>
        </View>
      </SafeAreaView>
    )
  }

  // -------------- Error banner --------------
  if (stage === 'error') {
    return (
      <SafeAreaView style={styles.fullCenter}>
        <Header title={t('najma.vision.title')} onBack={goBack} />
        <View style={styles.launchingCard}>
          <Ionicons name="alert-circle-outline" size={32} color={tokens.colors.danger} />
          <Text style={styles.launchingTitle}>{t('najma.vision.error')}</Text>
          <Pressable
            style={({ pressed }) => [styles.allowBtn, pressed && styles.btnPressed]}
            onPress={() => {
              if (capturedB64) handleAsk()
              else setStage('camera')
            }}
          >
            <Text style={styles.allowBtnText}>{t('najma.error.retry')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  // -------------- Camera live view --------------
  return (
    <View style={styles.screenDark}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      <SafeAreaView style={styles.cameraOverlay} pointerEvents="box-none">
        <View style={styles.cameraTop}>
          <Pressable onPress={goBack} hitSlop={10} style={styles.cameraTopBtn}>
            <Ionicons name="chevron-back" size={22} color={tokens.colors.white} />
          </Pressable>
          <Text style={styles.cameraTopTitle}>
            {mode ? t(MODES.find((m) => m.mode === mode)!.titleKey) : t('najma.vision.title')}
          </Text>
          <Pressable
            onPress={() => setStage('mode-select')}
            hitSlop={10}
            style={styles.cameraTopBtn}
          >
            <Ionicons name="close" size={22} color={tokens.colors.white} />
          </Pressable>
        </View>
        <View style={styles.cameraBottom}>
          <Pressable
            onPress={handleShutter}
            style={({ pressed }) => [styles.shutter, pressed && styles.shutterPressed]}
            accessibilityLabel={t('najma.vision.shutter')}
          >
            <View style={styles.shutterInner} />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  )
}

function Header({ title, onBack, dark }: { title: string; onBack: () => void; dark?: boolean }) {
  return (
    <View style={[styles.header, dark && styles.headerDark]}>
      <Pressable onPress={onBack} hitSlop={10} style={styles.headerBtn}>
        <Ionicons
          name="chevron-back"
          size={22}
          color={dark ? tokens.colors.white : tokens.colors.text}
        />
      </Pressable>
      <Text style={[styles.headerTitle, dark && styles.headerTitleDark]}>{title}</Text>
      <View style={styles.headerBtn} />
    </View>
  )
}
