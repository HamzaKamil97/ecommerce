import { View, Text, SafeAreaView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppButton } from '@/src/components/AppButton';
import { useTheme } from '@/src/theme/useTheme';

export const ONBOARDING_KEY = 'app.onboarded';

export default function OnboardingScreen() {
  const { colors, spacing, typography } = useTheme();
  const router = useRouter();

  const onContinue = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, padding: spacing.xl, justifyContent: 'space-between' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.xl }}>
          <Text style={{ fontSize: 96 }}>🛍️</Text>
          <View style={{ gap: spacing.md, alignItems: 'center' }}>
            <Text style={[typography.title, { color: colors.text, fontSize: 32, textAlign: 'center' }]}>
              Everything you need, in one place
            </Text>
            <Text
              style={[
                typography.body,
                { color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
              ]}
            >
              Food, flowers, vegetables, electronics, fashion — local shops and trusted brands, delivered to you.
            </Text>
          </View>
        </View>
        <View style={{ gap: spacing.md }}>
          <AppButton title="Start shopping" onPress={onContinue} />
        </View>
      </View>
    </SafeAreaView>
  );
}
