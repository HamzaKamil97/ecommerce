import { useEffect, useState } from 'react';
import { FlatList, SafeAreaView, ScrollView, Text, View, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getShopBySlug, emojiForVertical, Shop } from '@/src/api/shops';
import { listProducts } from '@/src/api/products';
import { Product } from '@/src/types/product';
import { ProductCard } from '@/src/components/ProductCard';
import { ProductCardSkeleton } from '@/src/components/Skeleton';
import { EmptyState } from '@/src/components/EmptyState';
import { useTheme } from '@/src/theme/useTheme';
import { MerchTabs } from '@/src/components/MerchTabs';
import { CartFab } from '@/src/components/CartFab';
import { fetchShopMerchCategories } from '@/src/lib/api/merch';
import { useCartStore } from '@/src/store/cartStore';
import type { MerchCategory } from '@/src/lib/api/types';

export default function ShopDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { colors, spacing, typography, radius } = useTheme();
  const itemCount: number = useCartStore((s) => s.itemCount());
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [merch, setMerch] = useState<MerchCategory[]>([]);
  const [activeMerch, setActiveMerch] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      const s = await getShopBySlug(slug);
      if (!mounted) return;
      setShop(s);
      if (s?.sales_channel_id) {
        const prods = await listProducts({
          // @ts-expect-error custom filter
          sales_channel_id: [s.sales_channel_id],
          limit: 50,
        }).catch(() => []);
        if (mounted) setProducts(prods);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    fetchShopMerchCategories(slug)
      .then((cats) => {
        setMerch(cats);
        setActiveMerch(cats[0]?.handle ?? null);
      })
      .catch((err) => console.error('merch fetch failed:', err));
  }, [slug]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.text} />
      </SafeAreaView>
    );
  }

  if (!shop) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <EmptyState title="Shop not found" subtitle="It may have been removed or is not yet approved." />
      </SafeAreaView>
    );
  }

  const primary = shop.branding?.primary_color ?? colors.primary;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView>
        <View
          style={{
            backgroundColor: primary,
            paddingTop: spacing.xl,
            paddingBottom: spacing.xl,
            paddingHorizontal: spacing.lg,
            alignItems: 'center',
            gap: spacing.md,
          }}
        >

          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {shop.branding?.logo_url ? (
              <Image
                source={{ uri: shop.branding.logo_url }}
                style={{ width: 80, height: 80, borderRadius: 40 }}
              />
            ) : (
              <Text style={{ fontSize: 48 }}>{emojiForVertical(shop.vertical)}</Text>
            )}
          </View>
          <Text style={[typography.title, { color: colors.primaryText, fontSize: 24 }]}>{shop.name}</Text>
          <Text style={[typography.caption, { color: colors.primaryText, textTransform: 'capitalize', opacity: 0.8 }]}>
            {shop.vertical}
          </Text>
        </View>

        {merch.length > 0 && (
          <MerchTabs
            categories={merch}
            activeHandle={activeMerch}
            onSelect={setActiveMerch}
          />
        )}

        <View style={{ padding: spacing.lg }}>
          <Text style={[typography.heading, { color: colors.text, marginBottom: spacing.md }]}>
            Products from {shop.name}
          </Text>
          {products.length > 0 ? (
            <FlatList
              data={products}
              numColumns={2}
              keyExtractor={(p) => p.id}
              scrollEnabled={false}
              renderItem={({ item }) => <ProductCard product={item} />}
            />
          ) : (
            <EmptyState
              title="No products yet"
              subtitle="This shop hasn't published any products yet. Check back soon."
            />
          )}
        </View>
      </ScrollView>
      <CartFab itemCount={itemCount} onPress={() => router.push('/(tabs)/cart')} />
    </SafeAreaView>
  );
}
