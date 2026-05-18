import { Pressable, View, Text, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import Animated, {
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { Product } from '../types/product';
import { PriceText } from './PriceText';
import { useTheme } from '../theme/useTheme';
import { useCartStore } from '../store/cartStore';

const AnimatedView = Animated.createAnimatedComponent(View);

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const { colors, spacing, radius, typography } = useTheme();
  const addItem = useCartStore((s) => s.addItem);
  const [adding, setAdding] = useState(false);
  const [addedFlash, setAddedFlash] = useState(false);

  const cardScale = useSharedValue(1);
  const addBtnScale = useSharedValue(1);

  const variant = product.variants?.[0];
  const price = variant?.calculated_price?.calculated_amount;
  const currency = variant?.calculated_price?.currency_code ?? 'USD';

  const onQuickAdd = async (e: any) => {
    e.stopPropagation?.();
    if (!variant) return;
    setAdding(true);
    addBtnScale.value = withSequence(
      withTiming(0.7, { duration: 80 }),
      withSpring(1.25, { damping: 4, stiffness: 200 }),
      withSpring(1, { damping: 6, stiffness: 150 })
    );
    try {
      await addItem(variant.id, 1);
      setAddedFlash(true);
      setTimeout(() => setAddedFlash(false), 1200);
    } finally {
      setAdding(false);
    }
  };

  const cardAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }));
  const btnAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: addBtnScale.value }] }));

  return (
    <Pressable
      onPress={() => router.push(`/products/${product.id}`)}
      onPressIn={() => (cardScale.value = withSpring(0.97, { damping: 12, stiffness: 250 }))}
      onPressOut={() => (cardScale.value = withSpring(1, { damping: 12, stiffness: 250 }))}
      style={styles.card}
    >
      <AnimatedView
        style={[
          {
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            padding: spacing.md,
          },
          cardAnimStyle,
        ]}
      >
        <View style={{ position: 'relative' }}>
          {product.thumbnail ? (
            <Image
              source={{ uri: product.thumbnail }}
              style={[styles.image, { borderRadius: radius.md }]}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.image,
                {
                  backgroundColor: colors.border,
                  borderRadius: radius.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
              ]}
            >
              <Text style={{ fontSize: 32 }}>🛍️</Text>
            </View>
          )}
          <AnimatedView style={[{ position: 'absolute', right: 6, bottom: 6 }, btnAnimStyle]}>
            <Pressable
              onPress={onQuickAdd}
              disabled={!variant || adding}
              style={{
                backgroundColor: addedFlash ? colors.success : colors.primary,
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: colors.primaryText, fontSize: 18, fontWeight: '700', lineHeight: 20 }}>
                {addedFlash ? '✓' : '+'}
              </Text>
            </Pressable>
          </AnimatedView>
        </View>
        <Text
          numberOfLines={2}
          style={[typography.body, { color: colors.text, marginTop: spacing.sm, fontWeight: '500' }]}
        >
          {product.title}
        </Text>
        <PriceText amount={price} currencyCode={currency} style={{ marginTop: 2 }} />
      </AnimatedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, margin: 6 },
  image: { width: '100%', aspectRatio: 1 },
});
