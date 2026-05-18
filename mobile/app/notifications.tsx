import { useEffect, useState, useCallback } from 'react';
import { FlatList, RefreshControl, SafeAreaView, Text, View, Pressable } from 'react-native';
import { useTheme } from '@/src/theme/useTheme';
import { useAuthStore } from '@/src/store/authStore';
import { listNotifications, markRead, Notification } from '@/src/api/notifications';
import { EmptyState } from '@/src/components/EmptyState';

export default function NotificationsScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const customer = useAuthStore((s) => s.customer);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!customer) return;
    const r = await listNotifications(customer.id).catch(() => ({ notifications: [], unread: 0 }));
    setNotifications(r.notifications);
    setUnread(r.unread);
  }, [customer]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onTap = async (n: Notification) => {
    if (!n.read_at) {
      await markRead(n.id);
      await load();
    }
  };

  if (!customer) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <EmptyState title="Log in to see notifications" subtitle="Go to Profile → Log in." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: spacing.lg }}>
        <Text style={[typography.title, { color: colors.text }]}>Notifications</Text>
        {unread > 0 && (
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4 }]}>
            {unread} unread
          </Text>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
        ListEmptyComponent={<EmptyState title="No notifications yet" subtitle="Your order updates and offers will appear here." />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onTap(item)}
            style={({ pressed }) => ({
              backgroundColor: item.read_at ? colors.surface : colors.background,
              borderRadius: radius.md,
              padding: spacing.md,
              borderWidth: 1,
              borderColor: item.read_at ? colors.border : colors.primary,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[typography.body, { color: colors.text, fontWeight: item.read_at ? '500' : '700' }]}>
                  {item.title}
                </Text>
                <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={2}>
                  {item.body}
                </Text>
                <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11 }]}>
                  {new Date(item.created_at).toLocaleString()}
                </Text>
              </View>
              {!item.read_at && (
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: colors.primary,
                    marginLeft: spacing.sm,
                    marginTop: 6,
                  }}
                />
              )}
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
