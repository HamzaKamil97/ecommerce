import { View, Text, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { AppButton } from '@/src/components/AppButton';
import { useTheme } from '@/src/theme/useTheme';

export default function OrderSuccessScreen() {
  const { colors, spacing, typography } = useTheme();
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, padding: spacing.xl, justifyContent: 'center', alignItems: 'center', gap: spacing.lg }}>
        <Text style={[typography.title, { color: colors.success }]}>Order placed!</Text>
        <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center' }]}>
          Thanks for your order. You can view it in the Orders tab.
        </Text>
        <AppButton title="Back to shop" onPress={() => router.replace('/(tabs)')} />
      </View>
    </SafeAreaView>
  );
}
