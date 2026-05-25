import { View, Text, SafeAreaView, Pressable, StyleSheet } from 'react-native';
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
import { useEffect, useState } from 'react';
import { AppButton } from '@/src/components/AppButton';
import { FadeIn } from '@/src/components/FadeIn';
import { tokens } from '@/src/theme/tokens';
import { t } from '@/src/i18n';
import { useLanguageStore } from '@/src/store/languageStore';
import type { Locale } from '@/src/i18n';

export const ONBOARDING_KEY = 'app.onboarded';

type Step = 'language' | 'welcome';

export default function OnboardingScreen() {
  const router = useRouter();
  useLanguageStore((s) => s.locale);
  const switchLanguage = useLanguageStore((s) => s.switchLanguage);
  const currentLocale = useLanguageStore((s) => s.locale);

  const [step, setStep] = useState<Step>('language');

  // Bag emoji floats up-down gently + scales in.
  const float = useSharedValue(0);
  const initialScale = useSharedValue(0.3);

  useEffect(() => {
    if (step !== 'welcome') return;
    initialScale.value = withSpring(1, { damping: 8, stiffness: 100 });
    float.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true
    );
  }, [step, float, initialScale]);

  const bagStyle = useAnimatedStyle(() => ({
    transform: [{ scale: initialScale.value }, { translateY: float.value }],
  }));

  const onContinue = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    router.replace('/(tabs)');
  };

  const onPickLanguage = async (code: Locale) => {
    if (code !== currentLocale) {
      await switchLanguage(code);
    }
    setStep('welcome');
  };

  if (step === 'language') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.bg }}>
        <View style={styles.langContainer}>
          <View style={styles.langHeader}>
            <Text style={styles.langTitle}>{t('onboarding.langTitle')}</Text>
            <Text style={styles.langSubtitle}>{t('onboarding.langSubtitle')}</Text>
          </View>

          <View style={styles.langButtons}>
            <LanguageButton
              flag="🇺🇸"
              label={t('onboarding.langEnglish')}
              active={currentLocale === 'en'}
              onPress={() => onPickLanguage('en')}
            />
            <LanguageButton
              flag="🇮🇶"
              label={t('onboarding.langArabic')}
              active={currentLocale === 'ar'}
              onPress={() => onPickLanguage('ar')}
            />
          </View>

          <Pressable
            onPress={() => setStep('welcome')}
            style={({ pressed }) => [styles.skipBtn, { opacity: pressed ? 0.6 : 1 }]}
            hitSlop={8}
          >
            <Text style={styles.skipText}>{t('onboarding.langSkip')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.bg }}>
      <View style={{ flex: 1, padding: tokens.spacing.xl, justifyContent: 'space-between' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: tokens.spacing.xl }}>
          <Animated.Text style={[{ fontSize: 96 }, bagStyle]}>🛍️</Animated.Text>
          <View style={{ gap: tokens.spacing.md, alignItems: 'center' }}>
            <FadeIn delay={300}>
              <Text style={{ fontSize: 32, fontWeight: tokens.fontWeight.bold, color: tokens.colors.text, textAlign: 'center' }}>
                {t('onboarding.title')}
              </Text>
            </FadeIn>
            <FadeIn delay={450}>
              <Text
                style={{ fontSize: tokens.fontSize.sm, color: tokens.colors.textMuted, textAlign: 'center', fontStyle: 'italic' }}
              >
                {t('onboarding.tagline')}
              </Text>
            </FadeIn>
            <FadeIn delay={600}>
              <Text
                style={{ fontSize: tokens.fontSize.base, color: tokens.colors.textMuted, textAlign: 'center', lineHeight: 22 }}
              >
                {t('onboarding.subtitle')}
              </Text>
            </FadeIn>
          </View>
        </View>
        <FadeIn delay={900} style={{ gap: tokens.spacing.md }}>
          <AppButton title={t('onboarding.cta')} onPress={onContinue} />
        </FadeIn>
      </View>
    </SafeAreaView>
  );
}

function LanguageButton({
  flag, label, active, onPress,
}: {
  flag: string;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.langButton,
        active && styles.langButtonActive,
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={styles.langFlag}>{flag}</Text>
      <Text style={[styles.langButtonLabel, active && styles.langButtonLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  langContainer: {
    flex: 1,
    padding: tokens.spacing.xl,
    justifyContent: 'center',
    gap: tokens.spacing.xxl,
  },
  langHeader: {
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  langTitle: {
    fontSize: tokens.fontSize.xxl,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
    textAlign: 'center',
  },
  langSubtitle: {
    fontSize: tokens.fontSize.base,
    color: tokens.colors.textMuted,
    textAlign: 'center',
  },
  langButtons: {
    gap: tokens.spacing.md,
  },
  langButton: {
    height: 56,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1.5,
    borderColor: tokens.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.lg,
  },
  langButtonActive: {
    backgroundColor: tokens.colors.primary,
    borderColor: tokens.colors.primary,
  },
  langFlag: {
    fontSize: 28,
  },
  langButtonLabel: {
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.text,
  },
  langButtonLabelActive: {
    color: tokens.colors.white,
  },
  skipBtn: {
    alignSelf: 'center',
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
  },
  skipText: {
    fontSize: tokens.fontSize.base,
    color: tokens.colors.textMuted,
    fontWeight: tokens.fontWeight.medium,
  },
});
