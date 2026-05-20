import { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, Text, View, Share, Alert, TextInput } from 'react-native';
import { tokens } from '@/src/theme/tokens';
import { useAuthStore } from '@/src/store/authStore';
import { getLoyalty, applyReferralCode, nextTier, tierColor, LoyaltyData } from '@/src/api/loyalty';
import { AppButton } from '@/src/components/AppButton';
import { EmptyState } from '@/src/components/EmptyState';

export default function LoyaltyScreen() {
  const customer = useAuthStore((s) => s.customer);
  const [data, setData] = useState<LoyaltyData | null>(null);
  const [code, setCode] = useState('');

  const load = async () => {
    if (!customer) return;
    setData(await getLoyalty(customer.id).catch(() => null));
  };

  useEffect(() => {
    load();
  }, [customer]);

  if (!customer) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.bg }}>
        <EmptyState title="Log in to see your rewards" subtitle="Go to Profile → Log in." />
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.bg }}>
        <EmptyState title="Loading…" />
      </SafeAreaView>
    );
  }

  const next = nextTier(data.tier);
  const progress = next ? Math.min(1, data.points / next.threshold) : 1;

  const onShare = async () => {
    if (!data.referral_code) return;
    await Share.share({
      message: `Join with my code "${data.referral_code}" and get 200 bonus points!`,
    });
  };

  const onApply = async () => {
    if (!code) return;
    try {
      await applyReferralCode(customer.id, code);
      Alert.alert('Code applied!', 'You received 200 welcome bonus points.');
      setCode('');
      await load();
    } catch (e: any) {
      Alert.alert('Code rejected', e?.response?.data?.error ?? e?.message);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: tokens.spacing.lg, gap: tokens.spacing.lg }}>
        {/* Hero */}
        <View
          style={{
            backgroundColor: tierColor(data.tier),
            borderRadius: tokens.radius.lg,
            padding: tokens.spacing.xl,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 14, color: '#0B0B0F', opacity: 0.7, textTransform: 'uppercase', letterSpacing: 2 }}>
            {data.tier} tier
          </Text>
          <Text style={{ fontSize: 48, fontWeight: '700', color: '#0B0B0F', marginTop: 8 }}>
            {data.points.toLocaleString()}
          </Text>
          <Text style={{ color: '#0B0B0F', opacity: 0.8 }}>points</Text>
        </View>

        {/* Progress */}
        {next && (
          <View style={{ gap: tokens.spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: tokens.fontSize.base, color: tokens.colors.text }}>Next tier: {next.tier}</Text>
              <Text style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.textMuted }}>
                {next.threshold - data.points} pts to go
              </Text>
            </View>
            <View
              style={{
                height: 8,
                backgroundColor: tokens.colors.surface,
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${progress * 100}%`,
                  height: '100%',
                  backgroundColor: tokens.colors.primary,
                }}
              />
            </View>
          </View>
        )}

        {/* Refer */}
        <View
          style={{
            backgroundColor: tokens.colors.surface,
            borderRadius: tokens.radius.lg,
            padding: tokens.spacing.lg,
            gap: tokens.spacing.md,
          }}
        >
          <Text style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.semibold, color: tokens.colors.text }}>Invite friends, earn 500 pts</Text>
          <Text style={{ fontSize: tokens.fontSize.base, color: tokens.colors.textMuted }}>
            Share your code. Friends get 200 bonus points on signup. You get 500 when they place their first order.
          </Text>
          <View
            style={{
              backgroundColor: tokens.colors.bg,
              borderRadius: tokens.radius.md,
              padding: tokens.spacing.md,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.semibold, color: tokens.colors.text, letterSpacing: 2 }}>
              {data.referral_code ?? '—'}
            </Text>
            <AppButton title="Share" onPress={onShare} />
          </View>
        </View>

        {/* Apply a code */}
        <View style={{ gap: tokens.spacing.sm }}>
          <Text style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.semibold, color: tokens.colors.text }}>Got a code?</Text>
          <View style={{ flexDirection: 'row', gap: tokens.spacing.sm }}>
            <TextInput
              value={code}
              onChangeText={(v) => setCode(v.toUpperCase())}
              placeholder="Enter referral code"
              placeholderTextColor={tokens.colors.textMuted}
              autoCapitalize="characters"
              style={{
                flex: 1,
                backgroundColor: tokens.colors.surface,
                color: tokens.colors.text,
                padding: tokens.spacing.md,
                borderRadius: tokens.radius.md,
              }}
            />
            <AppButton title="Apply" onPress={onApply} disabled={!code} />
          </View>
        </View>

        {/* Earn rules */}
        <View
          style={{
            backgroundColor: tokens.colors.surface,
            borderRadius: tokens.radius.lg,
            padding: tokens.spacing.lg,
            gap: tokens.spacing.sm,
          }}
        >
          <Text style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.semibold, color: tokens.colors.text }}>How you earn</Text>
          <Text style={{ fontSize: tokens.fontSize.base, color: tokens.colors.textMuted }}>• 10 points per $1 spent</Text>
          <Text style={{ fontSize: tokens.fontSize.base, color: tokens.colors.textMuted }}>• 200 bonus points when you join via a friend's code</Text>
          <Text style={{ fontSize: tokens.fontSize.base, color: tokens.colors.textMuted }}>• 500 points when a friend you referred places their first order</Text>
          <Text style={{ fontSize: tokens.fontSize.base, color: tokens.colors.textMuted }}>• Tier bumps: 1k = silver, 5k = gold, 20k = platinum</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
