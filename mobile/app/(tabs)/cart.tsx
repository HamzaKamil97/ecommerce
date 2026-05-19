import { FlatList, Text, View, SafeAreaView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useCartStore } from '@/src/store/cartStore';
import { useTheme } from '@/src/theme/useTheme';
import { EmptyState } from '@/src/components/EmptyState';
import { AppButton } from '@/src/components/AppButton';
import { PriceText } from '@/src/components/PriceText';

export default function CartScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  // TODO(SP-B): adapt to new cartStore API — full cart screen wiring in Phase 4
  const items = useCartStore((s) => s.items);
  const incQty = useCartStore((s) => s.incQty);
  const decQty = useCartStore((s) => s.decQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const subtotalMinor = useCartStore((s) => s.subtotalMinor);
  const shop_display_currency = useCartStore((s) => s.shop_display_currency);
  const router = useRouter();

  if (items.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <EmptyState title="Your cart is empty" subtitle="Add a product from the Shop tab." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.variant_id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: spacing.md,
              gap: spacing.sm,
            }}
          >
            <Text style={[typography.body, { color: colors.text }]}>{item.title}</Text>
            <PriceText amount={item.unit_price_minor} currencyCode={item.currency_code} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Pressable onPress={() => decQty(item.variant_id)}>
                <Text style={[typography.heading, { color: colors.text }]}>−</Text>
              </Pressable>
              <Text style={[typography.body, { color: colors.text }]}>{item.qty}</Text>
              <Pressable onPress={() => incQty(item.variant_id)}>
                <Text style={[typography.heading, { color: colors.text }]}>+</Text>
              </Pressable>
              <View style={{ flex: 1 }} />
              <Pressable onPress={() => removeItem(item.variant_id)}>
                <Text style={[typography.caption, { color: colors.danger }]}>Remove</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListFooterComponent={
          <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[typography.heading, { color: colors.text }]}>Total</Text>
              <PriceText amount={subtotalMinor()} currencyCode={shop_display_currency} />
            </View>
            <AppButton title="Checkout" onPress={() => router.push('/checkout')} />
          </View>
        }
      />
    </SafeAreaView>
  );
}
