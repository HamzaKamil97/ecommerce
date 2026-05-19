import React, { useState, useRef } from 'react'
import { View, Image, ScrollView, Dimensions, StyleSheet, NativeSyntheticEvent, NativeScrollEvent } from 'react-native'
import { tokens } from '@/src/theme/tokens'

interface Props {
  images: string[]
}

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const IMAGE_HEIGHT = 360

export function ImageCarousel({ images }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const scrollRef = useRef<ScrollView>(null)

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH)
    setActiveIndex(idx)
  }

  if (images.length === 0) {
    return <View style={[styles.placeholder]} />
  }

  return (
    <View style={styles.wrapper}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
      >
        {images.map((uri, i) => (
          <Image
            key={i}
            source={{ uri }}
            style={styles.image}
            resizeMode="cover"
          />
        ))}
      </ScrollView>
      {images.length > 1 && (
        <View style={styles.dotsRow}>
          {images.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    height: IMAGE_HEIGHT,
    backgroundColor: tokens.colors.surface,
  },
  placeholder: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    backgroundColor: tokens.colors.surface,
  },
  image: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
  },
  dotsRow: {
    position: 'absolute',
    bottom: tokens.spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: tokens.spacing.xs,
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
