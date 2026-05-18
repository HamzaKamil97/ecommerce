import { useEffect, useState } from 'react';
import { FlatList, SafeAreaView, Text, View, TextInput, Alert } from 'react-native';
import { useTheme } from '@/src/theme/useTheme';
import { useAuthStore } from '@/src/store/authStore';
import { getWallet, topupWallet, WalletData } from '@/src/api/wallet';
import { AppButton } from '@/src/components/AppButton';
import { EmptyState } from '@/src/components/EmptyState';

export default function WalletScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const customer = useAuthStore((s) => s.customer);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [topupAmount, setTopupAmount] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!customer) return;
    const w = await getWallet(customer.id).catch(() => null);
    setWallet(w);
  };

  useEffect(() => {
    load();
  }, [customer]);

  if (!customer) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <EmptyState title="Log in to use your wallet" subtitle="Go to Profile → Log in." />
      </SafeAreaView>
    );
  }

  const onTopup = async () => {
    const amount = Math.round(parseFloat(topupAmount) * 100);
    if (!amount || amount <= 0) return;
    setBusy(true);
    try {
      await topupWallet(customer.id, amount);
      Alert.alert('Top-up successful', `Added $${(amount / 100).toFixed(2)}`);
      setTopupAmount('');
      await load();
    } catch (e: any) {
      Alert.alert('Top-up failed', e?.message ?? 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: spacing.lg, gap: spacing.lg }}>
        <View
          style={{
            backgroundColor: colors.primary,
            borderRadius: radius.lg,
            padding: spacing.xl,
            alignItems: 'center',
          }}
        >
          <Text style={[typography.caption, { color: colors.primaryText, opacity: 0.8 }]}>Wallet balance</Text>
          <Text style={{ color: colors.primaryText, fontSize: 40, fontWeight: '700', marginTop: 4 }}>
            ${((wallet?.balance_cents ?? 0) / 100).toFixed(2)}
          </Text>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.heading, { color: colors.text }]}>Top up</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TextInput
              value={topupAmount}
              onChangeText={setTopupAmount}
              placeholder="Amount in USD"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={{
                flex: 1,
                backgroundColor: colors.surface,
                color: colors.text,
                padding: spacing.md,
                borderRadius: radius.md,
              }}
            />
            <AppButton title="Add" onPress={onTopup} loading={busy} disabled={!topupAmount} />
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {['10', '25', '50', '100'].map((amt) => (
              <AppButton
                key={amt}
                title={`$${amt}`}
                variant="secondary"
                onPress={() => setTopupAmount(amt)}
                style={{ flex: 1 }}
              />
            ))}
          </View>
        </View>
      </View>

      <Text style={[typography.heading, { color: colors.text, paddingHorizontal: spacing.lg, marginTop: spacing.md }]}>
        Recent transactions
      </Text>
      <FlatList
        data={wallet?.transactions ?? []}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
        ListEmptyComponent={<EmptyState title="No transactions yet" subtitle="Top up or place an order to see activity." />}
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: spacing.md,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{item.description ?? item.type}</Text>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                {new Date(item.created_at).toLocaleString()}
              </Text>
            </View>
            <Text
              style={{
                ...typography.body,
                color: item.amount_cents > 0 ? colors.success : colors.danger,
                fontWeight: '700',
              }}
            >
              {item.amount_cents > 0 ? '+' : ''}${(item.amount_cents / 100).toFixed(2)}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
