import { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, Text, View, Share, Alert, TextInput } from 'react-native';
import { tokens } from '@/src/theme/tokens';
import { t } from '@/src/i18n';
import { useLanguageStore } from '@/src/store/languageStore';
import { useAuthStore } from '@/src/store/authStore';
import { getLoyalty, applyReferralCode, nextTier, tierColor, LoyaltyData } from '@/src/api/loyalty';
import { AppButton } from '@/src/components/AppButton';
import { EmptyState } from '@/src/components/EmptyState';

export default function LoyaltyScreen() {
  useLanguageStore((s) => s.locale);
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
        <EmptyState title={t('loyalty.loginRequired.title')} subtitle={t('loyalty.loginRequired.subtitle')} />
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.bg }}>
        <EmptyState title={t('common.loading')} />
      </SafeAreaView>
    );
  }

  const next = nextTier(data.tier);
  const progress = next ? Math.min(1, data.points / next.threshold) : 1;

  const onShare = async () => {
    if (!data.referral_code) return;
    await Share.share({
      message: t('loyalty.invite.shareMessage', { code: data.referral_code }),
    });
  };

  const onApply = async () => {
    if (!code) return;
    try {
      await applyReferralCode(customer.id, code);
      Alert.alert(t('loyalty.code.applied.title'), t('loyalty.code.applied.message'));
      setCode('');
      await load();
    } catch (e: any) {
      Alert.alert(t('loyalty.code.rejected.title'), e?.response?.data?.error ?? e?.message);
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
            {t('loyalty.tierLabel', { tier: data.tier })}
          </Text>
          <Text style={{ fontSize: 48, fontWeight: '700', color: '#0B0B0F', marginTop: 8 }}>
            {data.points.toLocaleString()}
          </Text>
          <Text style={{ color: '#0B0B0F', opacity: 0.8 }}>{t('loyalty.points')}</Text>
        </View>

        {/* Progress */}
        {next && (
          <View style={{ gap: tokens.spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: tokens.fontSize.base, color: tokens.colors.text }}>{t('loyalty.nextTier', { tier: next.tier })}</Text>
              <Text style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.textMuted }}>
                {t('loyalty.ptsToGo', { pts: next.threshold - data.points })}
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
          <Text style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.semibold, color: tokens.colors.text }}>{t('loyalty.invite.title')}</Text>
          <Text style={{ fontSize: tokens.fontSize.base, color: tokens.colors.textMuted }}>
            {t('loyalty.invite.body')}
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
            <AppButton title={t('loyalty.invite.share')} onPress={onShare} />
          </View>
        </View>

        {/* Apply a code */}
        <View style={{ gap: tokens.spacing.sm }}>
          <Text style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.semibold, color: tokens.colors.text }}>{t('loyalty.code.title')}</Text>
          <View style={{ flexDirection: 'row', gap: tokens.spacing.sm }}>
            <TextInput
              value={code}
              onChangeText={(v) => setCode(v.toUpperCase())}
              placeholder={t('loyalty.code.placeholder')}
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
            <AppButton title={t('loyalty.code.apply')} onPress={onApply} disabled={!code} />
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
          <Text style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.semibold, color: tokens.colors.text }}>{t('loyalty.earn.title')}</Text>
          <Text style={{ fontSize: tokens.fontSize.base, color: tokens.colors.textMuted }}>{t('loyalty.earn.rule1')}</Text>
          <Text style={{ fontSize: tokens.fontSize.base, color: tokens.colors.textMuted }}>{t('loyalty.earn.rule2')}</Text>
          <Text style={{ fontSize: tokens.fontSize.base, color: tokens.colors.textMuted }}>{t('loyalty.earn.rule3')}</Text>
          <Text style={{ fontSize: tokens.fontSize.base, color: tokens.colors.textMuted }}>{t('loyalty.earn.rule4')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
