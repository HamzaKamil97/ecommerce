import React from 'react'
import { View, Text, Image, Pressable, StyleSheet } from 'react-native'
import { tokens } from '@/src/theme/tokens'
import { PriceText } from '@/src/components/PriceText'

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
  onAdd: () => void
}

export function ProductGridCard({ product, onPress, onAdd }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      {/* Image */}
      <View style={styles.imageWrap}>
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
        {/* Add button overlapping image bottom-right */}
        <Pressable
          onPress={(e) => { e.stopPropagation(); onAdd() }}
          style={styles.addBtn}
          hitSlop={6}
          accessibilityLabel={`Add ${product.title} to cart`}
        >
          <Text style={styles.addBtnText}>+</Text>
        </Pressable>
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
  addBtn: {
    position: 'absolute',
    bottom: tokens.spacing.sm,
    right: tokens.spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: tokens.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.floating,
  },
  addBtnText: {
    fontSize: 22,
    lineHeight: 28,
    color: tokens.colors.white,
    fontWeight: tokens.fontWeight.bold,
    marginTop: -2,
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
