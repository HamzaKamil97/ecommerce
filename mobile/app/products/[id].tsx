import { useEffect, useState } from 'react';
import { ScrollView, View, Text, Image, ActivityIndicator, SafeAreaView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getProduct, getProductVerticalFields, VerticalFields } from '@/src/api/products';
import { Product } from '@/src/types/product';
import { useTheme } from '@/src/theme/useTheme';
import { AppButton } from '@/src/components/AppButton';
import { PriceText } from '@/src/components/PriceText';
import { VerticalFieldsBlock } from '@/src/components/VerticalFieldsBlock';
import { useCartStore } from '@/src/store/cartStore';
import { DetailsPanel } from '@/src/components/DetailsPanel';
import { CartFab } from '@/src/components/CartFab';
import { fetchLeafSchema } from '@/src/lib/api/taxonomy';
import type { LeafSchema } from '@/src/lib/api/types';

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, typography, radius } = useTheme();
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const cart = useCartStore((s) => s.cart);
  const itemCount: number = cart?.items?.reduce((sum: number, i: any) => sum + (i.quantity ?? 1), 0) ?? 0;
  const [product, setProduct] = useState<Product | null>(null);
  const [verticalData, setVerticalData] = useState<VerticalFields | null>(null);
  const [schema, setSchema] = useState<LeafSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getProduct(id),
      getProductVerticalFields(id).catch(() => null),
    ])
      .then(([p, vf]) => {
        setProduct(p);
        setVerticalData(vf);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!product) return;
    const p = product as any;
    const taxonomyCat = p.categories?.find((c: any) => c.metadata?.is_taxonomy === true);
    if (!taxonomyCat) return;
    fetchLeafSchema(taxonomyCat.handle)
      .then(setSchema)
      .catch((err) => console.error('leaf schema fetch failed:', err));
  }, [product]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.text} />
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.text }}>Product not found.</Text>
      </SafeAreaView>
    );
  }

  const variant = product.variants?.[0];
  const price = variant?.calculated_price?.calculated_amount;
  const currency = variant?.calculated_price?.currency_code ?? 'USD';

  const onAdd = async () => {
    if (!variant) return;
    setAdding(true);
    try {
      await addItem(variant.id, 1);
      router.push('/(tabs)/cart');
    } finally {
      setAdding(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {product.thumbnail ? (
          <Image source={{ uri: product.thumbnail }} style={{ width: '100%', aspectRatio: 1 }} />
        ) : (
          <View style={{ width: '100%', aspectRatio: 1, backgroundColor: colors.surface }} />
        )}
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <Text style={[typography.title, { color: colors.text }]}>{product.title}</Text>
          <PriceText amount={price} currencyCode={currency} />
          {product.description ? (
            <Text style={[typography.body, { color: colors.textMuted }]}>{product.description}</Text>
          ) : null}
          <VerticalFieldsBlock data={verticalData} />
          {schema && (
            <DetailsPanel
              schema={schema}
              coreFields={((product as any).metadata?.core_fields as Record<string, unknown>) ?? {}}
              customFields={((product as any).metadata?.custom_fields as Record<string, unknown>) ?? {}}
            />
          )}
          <Pressable
            onPress={() => router.push(`/reviews/${product.id}`)}
            style={({ pressed }) => ({
              marginTop: spacing.md,
              padding: spacing.md,
              borderRadius: radius.md,
              backgroundColor: colors.surface,
              opacity: pressed ? 0.85 : 1,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            })}
          >
            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>★ Reviews & ratings</Text>
            <Text style={{ color: colors.textMuted, fontSize: 18 }}>›</Text>
          </Pressable>
        </View>
      </ScrollView>
      <View
        style={{
          padding: spacing.lg,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.background,
        }}
      >
        <AppButton title="Add to cart" onPress={onAdd} loading={adding} disabled={!variant} />
      </View>
      <CartFab itemCount={itemCount} onPress={() => router.push('/(tabs)/cart')} />
    </SafeAreaView>
  );
}
