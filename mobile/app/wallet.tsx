import { useEffect, useState } from 'react';
import { FlatList, SafeAreaView, Text, View, TextInput, Alert } from 'react-native';
import { tokens } from '@/src/theme/tokens';
import { useAuthStore } from '@/src/store/authStore';
import { getWallet, topupWallet, WalletData } from '@/src/api/wallet';
import { AppButton } from '@/src/components/AppButton';
import { EmptyState } from '@/src/components/EmptyState';

export default function WalletScreen() {
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
      <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.bg }}>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.bg }}>
      <View style={{ padding: tokens.spacing.lg, gap: tokens.spacing.lg }}>
        <View
          style={{
            backgroundColor: tokens.colors.primary,
            borderRadius: tokens.radius.lg,
            padding: tokens.spacing.xl,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.white, opacity: 0.8 }}>Wallet balance</Text>
          <Text style={{ color: tokens.colors.white, fontSize: 40, fontWeight: '700', marginTop: 4 }}>
            ${((wallet?.balance_cents ?? 0) / 100).toFixed(2)}
          </Text>
        </View>

        <View style={{ gap: tokens.spacing.sm }}>
          <Text style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.semibold, color: tokens.colors.text }}>Top up</Text>
          <View style={{ flexDirection: 'row', gap: tokens.spacing.sm }}>
            <TextInput
              value={topupAmount}
              onChangeText={setTopupAmount}
              placeholder="Amount in USD"
              placeholderTextColor={tokens.colors.textMuted}
              keyboardType="decimal-pad"
              style={{
                flex: 1,
                backgroundColor: tokens.colors.surface,
                color: tokens.colors.text,
                padding: tokens.spacing.md,
                borderRadius: tokens.radius.md,
              }}
            />
            <AppButton title="Add" onPress={onTopup} loading={busy} disabled={!topupAmount} />
          </View>
          <View style={{ flexDirection: 'row', gap: tokens.spacing.sm }}>
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

      <Text style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.semibold, color: tokens.colors.text, paddingHorizontal: tokens.spacing.lg, marginTop: tokens.spacing.md }}>
        Recent transactions
      </Text>
      <FlatList
        data={wallet?.transactions ?? []}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: tokens.spacing.lg, gap: tokens.spacing.sm }}
        ListEmptyComponent={<EmptyState title="No transactions yet" subtitle="Top up or place an order to see activity." />}
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: tokens.colors.surface,
              borderRadius: tokens.radius.md,
              padding: tokens.spacing.md,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: tokens.fontSize.base, color: tokens.colors.text, fontWeight: '600' }}>{item.description ?? item.type}</Text>
              <Text style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.textMuted }}>
                {new Date(item.created_at).toLocaleString()}
              </Text>
            </View>
            <Text
              style={{
                fontSize: tokens.fontSize.base,
                color: item.amount_cents > 0 ? tokens.colors.success : tokens.colors.danger,
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
