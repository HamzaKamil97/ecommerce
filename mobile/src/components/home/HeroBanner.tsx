import React, { useState, useRef, useEffect } from 'react'
import { View, Text, Pressable, ScrollView, Image, Dimensions, StyleSheet, NativeSyntheticEvent, NativeScrollEvent } from 'react-native'
import { tokens } from '@/src/theme/tokens'

export interface HeroSlide {
  id: string
  title: string
  subtitle: string
  ctaLabel: string
  imageUrl: string
}

interface Props {
  slides: HeroSlide[]
  onCta: (slide: HeroSlide) => void
}

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const BANNER_HEIGHT = 190
const SLIDE_WIDTH = SCREEN_WIDTH - tokens.spacing.lg * 2

export function HeroBanner({ slides, onCta }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const scrollRef = useRef<ScrollView>(null)
  const userInteractedRef = useRef(false)
  const skipFirstTickRef = useRef(true)

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SLIDE_WIDTH)
    setActiveIndex(idx)
  }

  useEffect(() => {
    if (slides.length <= 1) return
    const timer = setInterval(() => {
      if (skipFirstTickRef.current) {
        skipFirstTickRef.current = false
        return
      }
      if (userInteractedRef.current) return
      setActiveIndex((prev) => {
        const next = (prev + 1) % slides.length
        scrollRef.current?.scrollTo({ x: next * SLIDE_WIDTH, animated: true })
        return next
      })
    }, 5000)
    return () => clearInterval(timer)
  }, [slides.length])

  return (
    <View style={styles.wrapper}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        onScrollBeginDrag={() => { userInteractedRef.current = true }}
        snapToInterval={SLIDE_WIDTH}
        decelerationRate="fast"
        style={styles.scroll}
      >
        {slides.map((slide) => (
          <View key={slide.id} style={styles.slide}>
            <Image source={{ uri: slide.imageUrl }} style={styles.image} resizeMode="cover" />
            <View style={styles.overlay} />
            <View style={styles.content}>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.subtitle}>{slide.subtitle}</Text>
              <Pressable style={styles.ctaBtn} onPress={() => onCta(slide)}>
                <Text style={styles.ctaText}>{slide.ctaLabel}</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.dotsRow}>
        {slides.map((s, i) => (
          <View key={`dot-${s.id}`} style={[styles.dot, i === activeIndex && styles.dotActive]} />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
    ...tokens.shadow.card,
  },
  scroll: { height: BANNER_HEIGHT },
  slide: { width: SCREEN_WIDTH - tokens.spacing.lg * 2, height: BANNER_HEIGHT, position: 'relative' },
  image: { ...StyleSheet.absoluteFillObject },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  content: {
    position: 'absolute',
    bottom: tokens.spacing.xl,
    left: tokens.spacing.lg,
    right: tokens.spacing.lg,
  },
  title: {
    fontSize: tokens.fontSize.xl,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.white,
    marginBottom: tokens.spacing.xs,
  },
  subtitle: {
    fontSize: tokens.fontSize.sm,
    color: 'rgba(255,255,255,0.88)',
    marginBottom: tokens.spacing.md,
  },
  ctaBtn: {
    alignSelf: 'flex-start',
    backgroundColor: tokens.colors.white,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.pill,
  },
  ctaText: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.primary,
  },
  dotsRow: {
    position: 'absolute',
    bottom: tokens.spacing.sm,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: tokens.spacing.xs,
    left: 0,
    right: 0,
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    width: 14,
    backgroundColor: tokens.colors.white,
  },
})
