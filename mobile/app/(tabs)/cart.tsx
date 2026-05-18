import { FlatList, Text, View, SafeAreaView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useCartStore } from '@/src/store/cartStore';
import { useTheme } from '@/src/theme/useTheme';
import { EmptyState } from '@/src/components/EmptyState';
import { AppButton } from '@/src/components/AppButton';
import { PriceText } from '@/src/components/PriceText';

export default function CartScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const cart = useCartStore((s) => s.cart);
  const updateItem = useCartStore((s) => s.updateItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const router = useRouter();

  const items = cart?.items ?? [];

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
        keyExtractor={(item) => item.id}
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
            <PriceText amount={item.unit_price} currencyCode={cart?.currency_code} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Pressable onPress={() => updateItem(item.id, Math.max(1, item.quantity - 1))}>
                <Text style={[typography.heading, { color: colors.text }]}>−</Text>
              </Pressable>
              <Text style={[typography.body, { color: colors.text }]}>{item.quantity}</Text>
              <Pressable onPress={() => updateItem(item.id, item.quantity + 1)}>
                <Text style={[typography.heading, { color: colors.text }]}>+</Text>
              </Pressable>
              <View style={{ flex: 1 }} />
              <Pressable onPress={() => removeItem(item.id)}>
                <Text style={[typography.caption, { color: colors.danger }]}>Remove</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListFooterComponent={
          <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[typography.heading, { color: colors.text }]}>Total</Text>
              <PriceText amount={cart?.total} currencyCode={cart?.currency_code} />
            </View>
            <AppButton title="Checkout" onPress={() => router.push('/checkout')} />
          </View>
        }
      />
    </SafeAreaView>
  );
}
