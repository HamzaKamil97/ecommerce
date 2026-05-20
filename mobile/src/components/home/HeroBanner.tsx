import React, { useState, useRef, useEffect } from 'react'
import { View, Text, Pressable, FlatList, Image, Dimensions, StyleSheet, type ViewToken } from 'react-native'
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
  const listRef = useRef<FlatList<HeroSlide>>(null)
  const userInteractedRef = useRef(false)
  const hasMeasuredRef = useRef(false)

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && typeof viewableItems[0].index === 'number') {
        setActiveIndex(viewableItems[0].index)
      }
    },
  ).current

  useEffect(() => {
    if (slides.length <= 1) return
    const timer = setInterval(() => {
      if (!hasMeasuredRef.current) return
      if (userInteractedRef.current) return
      setActiveIndex((prev) => {
        const next = (prev + 1) % slides.length
        listRef.current?.scrollToOffset({ offset: next * SLIDE_WIDTH, animated: true })
        return next
      })
    }, 5000)
    return () => clearInterval(timer)
  }, [slides.length])

  return (
    <View style={styles.wrapper} onLayout={() => { hasMeasuredRef.current = true }}>
      <FlatList<HeroSlide>
        ref={listRef}
        data={slides}
        keyExtractor={(s) => s.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={SLIDE_WIDTH}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        getItemLayout={(_, i) => ({ length: SLIDE_WIDTH, offset: SLIDE_WIDTH * i, index: i })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScrollBeginDrag={() => { userInteractedRef.current = true }}
        style={styles.scroll}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
            <View style={styles.overlay} />
            <View style={styles.content}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
              <Pressable style={styles.ctaBtn} onPress={() => onCta(item)}>
                <Text style={styles.ctaText}>{item.ctaLabel}</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
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
  slide: { width: SLIDE_WIDTH, height: BANNER_HEIGHT, position: 'relative' },
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
