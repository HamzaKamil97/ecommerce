import { useEffect, useState, useMemo } from 'react';
import { FlatList, SafeAreaView, ScrollView, Text, View, RefreshControl } from 'react-native';
import { listApprovedShops, listVerticalTemplates, Shop, VerticalTemplate } from '@/src/api/shops';
import { ShopCard } from '@/src/components/ShopCard';
import { EmptyState } from '@/src/components/EmptyState';
import { CategoryChip } from '@/src/components/CategoryChip';
import { useTheme } from '@/src/theme/useTheme';

export default function ShopsScreen() {
  const { colors, spacing, typography } = useTheme();
  const [shops, setShops] = useState<Shop[]>([]);
  const [verticals, setVerticals] = useState<VerticalTemplate[]>([]);
  const [activeVertical, setActiveVertical] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const [s, v] = await Promise.all([
      listApprovedShops().catch(() => []),
      listVerticalTemplates().catch(() => []),
    ]);
    setShops(s);
    setVerticals(v);
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    load().finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const filtered = useMemo(
    () => (activeVertical ? shops.filter((s) => s.vertical === activeVertical) : shops),
    [shops, activeVertical]
  );

  // Group by vertical for "rails" view
  const groupedByVertical = useMemo(() => {
    const groups = new Map<string, Shop[]>();
    for (const shop of filtered) {
      if (!groups.has(shop.vertical)) groups.set(shop.vertical, []);
      groups.get(shop.vertical)!.push(shop);
    }
    return Array.from(groups.entries());
  }, [filtered]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      >
        <View style={{ padding: spacing.lg, gap: spacing.sm }}>
          <Text style={[typography.title, { color: colors.text, fontSize: 28 }]}>Shops</Text>
          <Text style={[typography.body, { color: colors.textMuted }]}>
            Local merchants and trusted brands, all in one place.
          </Text>
        </View>

        {verticals.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}
          >
            <CategoryChip
              label="All shops"
              emoji="🌟"
              selected={activeVertical === null}
              onPress={() => setActiveVertical(null)}
            />
            {verticals
              .filter((v) => v.vertical !== 'general')
              .map((v) => (
                <CategoryChip
                  key={v.vertical}
                  label={v.label}
                  emoji={v.emoji}
                  selected={activeVertical === v.vertical}
                  onPress={() => setActiveVertical(activeVertical === v.vertical ? null : v.vertical)}
                />
              ))}
          </ScrollView>
        )}

        {filtered.length === 0 ? (
          <EmptyState
            title="No shops yet"
            subtitle={
              loading
                ? 'Loading shops…'
                : 'When tenants are onboarded, they will appear here. For now, browse products in the Shop tab.'
            }
          />
        ) : (
          groupedByVertical.map(([vertical, shopList]) => (
            <View key={vertical} style={{ marginTop: spacing.md }}>
              <Text
                style={[
                  typography.heading,
                  {
                    color: colors.text,
                    paddingHorizontal: spacing.lg,
                    marginBottom: spacing.sm,
                    textTransform: 'capitalize',
                  },
                ]}
              >
                {vertical}
              </Text>
              <FlatList
                horizontal
                data={shopList}
                keyExtractor={(s) => s.id}
                contentContainerStyle={{ paddingHorizontal: spacing.lg }}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => <ShopCard shop={item} />}
              />
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
