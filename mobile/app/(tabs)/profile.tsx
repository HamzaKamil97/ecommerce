import { Text, View, SafeAreaView, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/store/authStore';
import { useTheme } from '@/src/theme/useTheme';
import { AppButton } from '@/src/components/AppButton';

interface RowProps {
  emoji: string;
  label: string;
  onPress: () => void;
  hint?: string;
}

export default function ProfileScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const customer = useAuthStore((s) => s.customer);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  const Row = ({ emoji, label, onPress, hint }: RowProps) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text style={{ fontSize: 24 }}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{label}</Text>
        {hint ? <Text style={[typography.caption, { color: colors.textMuted }]}>{hint}</Text> : null}
      </View>
      <Text style={{ color: colors.textMuted, fontSize: 22 }}>›</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <Text style={[typography.title, { color: colors.text, fontSize: 28 }]}>Profile</Text>

        {customer ? (
          <>
            {/* Identity card */}
            <View
              style={{
                backgroundColor: colors.primary,
                borderRadius: radius.lg,
                padding: spacing.lg,
                gap: 4,
              }}
            >
              <Text style={{ ...typography.heading, color: colors.primaryText }}>
                {customer.first_name ?? 'There'} {customer.last_name ?? ''}
              </Text>
              <Text style={{ color: colors.primaryText, opacity: 0.8 }}>{customer.email}</Text>
            </View>

            {/* Menu */}
            <View style={{ gap: spacing.sm }}>
              <Row emoji="🎁" label="Rewards & referrals" hint="Points, tier, referral code" onPress={() => router.push('/loyalty')} />
              <Row emoji="💳" label="Wallet" hint="Balance & top-up" onPress={() => router.push('/wallet')} />
              <Row emoji="🔔" label="Notifications" hint="Order updates, offers" onPress={() => router.push('/notifications')} />
              <Row emoji="📦" label="My orders" onPress={() => router.push('/(tabs)/orders')} />
              <Row emoji="🏬" label="Browse shops" onPress={() => router.push('/(tabs)/shops')} />
            </View>

            <AppButton title="Log out" variant="secondary" onPress={logout} />
          </>
        ) : (
          <View style={{ gap: spacing.md }}>
            <Text style={[typography.body, { color: colors.textMuted }]}>
              Sign in to access your orders, rewards, wallet, and personalized recommendations.
            </Text>
            <AppButton title="Log in" onPress={() => router.push('/auth/login')} />
            <AppButton title="Create account" variant="secondary" onPress={() => router.push('/auth/register')} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
