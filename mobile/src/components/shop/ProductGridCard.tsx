import React, { useRef } from 'react'
import { View, Text, Image, Pressable, StyleSheet } from 'react-native'
import { tokens } from '@/src/theme/tokens'
import { PriceText } from '@/src/components/PriceText'
import { QuantityStepper } from '@/src/components/QuantityStepper'

interface ProductItem {
  id: string
  title: string
  thumbnail: string | null
  price_minor: number
  currencyCode: string
}

interface Props {
  product: ProductItem
  onPress: () => void
  /** Called with (pageX, pageY, size) of the image centre so caller can trigger fly animation */
  onAdd: (fromX: number, fromY: number, sourceSize: number) => void
  qty?: number
  onIncrement?: () => void
  onDecrement?: () => void
}

export function ProductGridCard({ product, onPress, onAdd, qty = 0, onIncrement, onDecrement }: Props) {
  const imageRef = useRef<View>(null)

  function fireAdd() {
    if (imageRef.current) {
      imageRef.current.measureInWindow((x, y, w, h) => {
        onAdd(x + w / 2, y + h / 2, Math.min(w, h))
      })
    } else {
      onAdd(0, 0, 60)
    }
  }

  return (
    <Pressable onPress={onPress} style={styles.card}>
      {/* Image */}
      <View style={styles.imageWrap} ref={imageRef}>
        {product.thumbnail ? (
          <Image
            source={{ uri: product.thumbnail }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Text style={styles.imageFallbackText}>🛍️</Text>
          </View>
        )}
        {/* Stepper bottom-right */}
        <View style={styles.stepperWrap}>
          <QuantityStepper
            qty={qty}
            onAdd={fireAdd}
            onIncrement={onIncrement ?? fireAdd}
            onDecrement={onDecrement ?? (() => {})}
            size="sm"
          />
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{product.title}</Text>
        <PriceText
          amount={product.price_minor}
          currencyCode={product.currencyCode}
          style={styles.price}
        />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
    borderRadius: tokens.radius.md,
    overflow: 'hidden',
    margin: tokens.spacing.xs,
    ...tokens.shadow.card,
  },
  imageWrap: {
    aspectRatio: 1,
    width: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    backgroundColor: tokens.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFallbackText: { fontSize: 32 },
  stepperWrap: {
    position: 'absolute',
    bottom: tokens.spacing.sm,
    right: tokens.spacing.sm,
  },
  info: {
    padding: tokens.spacing.sm,
    gap: tokens.spacing.xs,
  },
  title: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
    lineHeight: 18,
  },
  price: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
})
