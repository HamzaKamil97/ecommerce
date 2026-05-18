import { useEffect, useState } from 'react';
import { FlatList, Text, View, SafeAreaView } from 'react-native';
import { useTheme } from '@/src/theme/useTheme';
import { EmptyState } from '@/src/components/EmptyState';
import { useAuthStore } from '@/src/store/authStore';
import { listOrders } from '@/src/api/auth';

export default function OrdersScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const customer = useAuthStore((s) => s.customer);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!customer) return;
    setLoading(true);
    listOrders()
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [customer]);

  if (!customer) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <EmptyState title="Log in to see your orders" subtitle="Go to Profile → Log in." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: spacing.md,
            }}
          >
            <Text style={[typography.body, { color: colors.text }]}>Order #{item.display_id ?? item.id}</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>{item.status}</Text>
          </View>
        )}
        ListEmptyComponent={
          !loading ? <EmptyState title="No orders yet" subtitle="Your orders will appear here." /> : null
        }
      />
    </SafeAreaView>
  );
}
