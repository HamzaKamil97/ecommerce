import { useState } from 'react';
import { View, TextInput, Text, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/store/authStore';
import { useLanguageStore } from '@/src/store/languageStore';
import { t } from '@/src/i18n';
import { tokens } from '@/src/theme/tokens';
import { AppButton } from '@/src/components/AppButton';

export default function LoginScreen() {
  useLanguageStore((s) => s.locale);
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? t('auth.error.loginFailed'));
    }
  };

  const inputStyle = {
    backgroundColor: tokens.colors.surface,
    color: tokens.colors.text,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.bg }}>
      <StatusBar style="dark" />
      <View style={{ padding: tokens.spacing.lg, gap: tokens.spacing.md }}>
        <Text style={{ fontSize: tokens.fontSize.xxl, fontWeight: tokens.fontWeight.bold, color: tokens.colors.text }}>{t('auth.welcomeBack')}</Text>
        <TextInput
          placeholder={t('auth.email.placeholder')}
          placeholderTextColor={tokens.colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={inputStyle}
        />
        <TextInput
          placeholder={t('auth.password.placeholder')}
          placeholderTextColor={tokens.colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={inputStyle}
        />
        {error ? <Text style={{ color: tokens.colors.danger }}>{error}</Text> : null}
        <AppButton title={t('auth.login')} onPress={onSubmit} loading={isLoading} />
        <AppButton
          title={t('auth.needAccount')}
          variant="secondary"
          onPress={() => router.replace('/auth/register')}
        />
        <Text style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.textMuted, textAlign: 'center', marginTop: tokens.spacing.lg }}>
          {t('auth.oauthComing')}
        </Text>
      </View>
    </SafeAreaView>
  );
}
