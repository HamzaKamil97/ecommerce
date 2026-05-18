import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { listProducts } from '@/src/api/products';
import { listCategories, emojiForCategory, Category } from '@/src/api/categories';
import { Product } from '@/src/types/product';
import { ProductCard } from '@/src/components/ProductCard';
import { ProductCardSkeleton } from '@/src/components/Skeleton';
import { CategoryChip } from '@/src/components/CategoryChip';
import { EmptyState } from '@/src/components/EmptyState';
import { useTheme } from '@/src/theme/useTheme';
import { useAuthStore } from '@/src/store/authStore';
import { FilterChips, ChipDef } from '@/src/components/FilterChips';
import { CartFab } from '@/src/components/CartFab';
import { useCartStore } from '@/src/store/cartStore';

export default function HomeScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const customer = useAuthStore((s) => s.customer);
  const cart = useCartStore((s) => s.cart);
  const itemCount: number = cart?.items?.reduce((sum: number, i: any) => sum + (i.quantity ?? 1), 0) ?? 0;
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // FilterChips state
  const [section, setSection] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [fastOnly, setFastOnly] = useState(false);
  const [sort, setSort] = useState<'best' | 'cheapest' | 'fastest'>('best');

  const chips: ChipDef[] = useMemo(() => [
    { id: 'section', label: section ?? 'Section', active: !!section, hasCaret: true },
    { id: 'category', label: category ?? 'Category', active: !!category, hasCaret: true },
    { id: 'fast', label: 'Fast delivery', active: fastOnly, prefix: '⚡' },
    { id: 'sort', label: `Sort: ${sort}`, active: false, hasCaret: true },
  ], [section, category, fastOnly, sort]);

  function onChip(id: string) {
    if (id === 'fast') setFastOnly((x) => !x);
    // section/category/sort pickers wired in SP-G or later — for now no-op
  }

  const load = useCallback(async (q?: string, categoryId?: string | null) => {
    setError(null);
    try {
      const data = await listProducts({
        q: q || undefined,
        category_id: categoryId ? [categoryId] : undefined,
        limit: 50,
      });
      setProducts(data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load products');
      setProducts([]);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([listCategories().catch(() => []), listProducts({ limit: 50 }).catch(() => [])])
      .then(([cats, prods]) => {
        if (!mounted) return;
        setCategories(cats);
        setProducts(prods);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  // debounced search
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      load(query, activeCategory);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeCategory]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load(query, activeCategory);
    } finally {
      setRefreshing(false);
    }
  };

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const skeletonData = useMemo(() => Array.from({ length: 6 }, (_, i) => i), []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm }}>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          {greeting}
          {customer ? `, ${customer.first_name ?? ''}` : ''}
        </Text>
        <Text style={[typography.title, { color: colors.text, fontSize: 28 }]}>What are you craving?</Text>
        <TextInput
          placeholder="Search products, shops, categories…"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          style={{
            backgroundColor: colors.surface,
            color: colors.text,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
            borderRadius: radius.lg,
            marginTop: spacing.sm,
          }}
        />
      </View>

      <FilterChips chips={chips} onPress={onChip} />

      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
          }}
          style={{ flexGrow: 0, maxHeight: 56 }}
        >
          <CategoryChip
            label="All"
            emoji="🌟"
            selected={activeCategory === null}
            onPress={() => setActiveCategory(null)}
          />
          {categories.map((cat) => (
            <CategoryChip
              key={cat.id}
              label={cat.name}
              emoji={emojiForCategory(cat.handle)}
              selected={activeCategory === cat.id}
              onPress={() => setActiveCategory(cat.id === activeCategory ? null : cat.id)}
            />
          ))}
        </ScrollView>
      )}

      {loading ? (
        <FlatList
          data={skeletonData}
          numColumns={2}
          keyExtractor={(i) => String(i)}
          contentContainerStyle={{ paddingHorizontal: spacing.sm, paddingBottom: spacing.xl }}
          renderItem={() => <ProductCardSkeleton />}
        />
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.sm, paddingBottom: spacing.xl }}
          renderItem={({ item }) => <ProductCard product={item} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.text}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title={error ? 'Could not load products' : 'No products found'}
              subtitle={error ?? 'Try a different search or category.'}
            />
          }
        />
      )}
      <CartFab itemCount={itemCount} onPress={() => router.push('/(tabs)/cart')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({});
