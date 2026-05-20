import { View, Text, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { AppButton } from '@/src/components/AppButton';
import { FadeIn } from '@/src/components/FadeIn';
import { tokens } from '@/src/theme/tokens';

export const ONBOARDING_KEY = 'app.onboarded';

export default function OnboardingScreen() {
  const router = useRouter();

  // Bag emoji floats up-down gently + scales in.
  const float = useSharedValue(0);
  const initialScale = useSharedValue(0.3);

  useEffect(() => {
    initialScale.value = withSpring(1, { damping: 8, stiffness: 100 });
    float.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true
    );
  }, [float, initialScale]);

  const bagStyle = useAnimatedStyle(() => ({
    transform: [{ scale: initialScale.value }, { translateY: float.value }],
  }));

  const onContinue = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.bg }}>
      <View style={{ flex: 1, padding: tokens.spacing.xl, justifyContent: 'space-between' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: tokens.spacing.xl }}>
          <Animated.Text style={[{ fontSize: 96 }, bagStyle]}>🛍️</Animated.Text>
          <View style={{ gap: tokens.spacing.md, alignItems: 'center' }}>
            <FadeIn delay={300}>
              <Text style={{ fontSize: 32, fontWeight: tokens.fontWeight.bold, color: tokens.colors.text, textAlign: 'center' }}>
                Everything you need, in one place
              </Text>
            </FadeIn>
            <FadeIn delay={600}>
              <Text
                style={{ fontSize: tokens.fontSize.base, color: tokens.colors.textMuted, textAlign: 'center', lineHeight: 22 }}
              >
                Food, flowers, vegetables, electronics, fashion — local shops and trusted brands, delivered to you.
              </Text>
            </FadeIn>
          </View>
        </View>
        <FadeIn delay={900} style={{ gap: tokens.spacing.md }}>
          <AppButton title="Start shopping" onPress={onContinue} />
        </FadeIn>
      </View>
    </SafeAreaView>
  );
}
