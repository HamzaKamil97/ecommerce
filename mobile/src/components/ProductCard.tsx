import { Pressable, View, Text, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Product } from '../types/product';
import { PriceText } from './PriceText';
import { useTheme } from '../theme/useTheme';
import { useCartStore } from '../store/cartStore';
import { useState } from 'react';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const { colors, spacing, radius, typography } = useTheme();
  const addItem = useCartStore((s) => s.addItem);
  const [adding, setAdding] = useState(false);

  const variant = product.variants?.[0];
  const price = variant?.calculated_price?.calculated_amount;
  const currency = variant?.calculated_price?.currency_code ?? 'USD';
  const onQuickAdd = async (e: any) => {
    e.stopPropagation?.();
    if (!variant) return;
    setAdding(true);
    try {
      await addItem(variant.id, 1);
    } finally {
      setAdding(false);
    }
  };

  return (
    <Pressable
      onPress={() => router.push(`/products/${product.id}`)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing.md,
          opacity: pressed ? 0.9 : 1,
        },
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
        <Pressable
          onPress={onQuickAdd}
          disabled={!variant || adding}
          style={({ pressed }) => ({
            position: 'absolute',
            right: 6,
            bottom: 6,
            backgroundColor: colors.primary,
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed || adding ? 0.6 : 1,
          })}
        >
          <Text style={{ color: colors.primaryText, fontSize: 20, fontWeight: '700', lineHeight: 22 }}>
            +
          </Text>
        </Pressable>
      </View>
      <Text
        numberOfLines={2}
        style={[typography.body, { color: colors.text, marginTop: spacing.sm, fontWeight: '500' }]}
      >
        {product.title}
      </Text>
      <PriceText amount={price} currencyCode={currency} style={{ marginTop: 2 }} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, margin: 6 },
  image: { width: '100%', aspectRatio: 1 },
});
