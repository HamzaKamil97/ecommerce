// DEPRECATED: This flat route is superseded by /order/success/[id] (mobile/app/order/success/[id].tsx).
// Kept for backwards compatibility. Do not add features here.
import { View, Text, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { AppButton } from '@/src/components/AppButton';
import { SuccessCheckmark } from '@/src/components/SuccessCheckmark';
import { FadeIn } from '@/src/components/FadeIn';
import { useTheme } from '@/src/theme/useTheme';

export default function OrderSuccessScreen() {
  const { colors, spacing, typography } = useTheme();
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, padding: spacing.xl, justifyContent: 'center', alignItems: 'center', gap: spacing.lg }}>
        <SuccessCheckmark size={120} />
        <FadeIn delay={500}>
          <Text style={[typography.title, { color: colors.text, fontSize: 28, textAlign: 'center' }]}>
            Order placed!
          </Text>
        </FadeIn>
        <FadeIn delay={700}>
          <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center', maxWidth: 280 }]}>
            Thanks for your order. The shop is preparing it now. You'll get a notification when it's on the way.
          </Text>
        </FadeIn>
        <FadeIn delay={950} style={{ width: '100%', gap: spacing.sm, marginTop: spacing.lg }}>
          <AppButton title="Track in Orders" onPress={() => router.replace('/(tabs)/orders')} />
          <AppButton title="Back to shop" variant="secondary" onPress={() => router.replace('/(tabs)')} />
        </FadeIn>
      </View>
    </SafeAreaView>
  );
}
