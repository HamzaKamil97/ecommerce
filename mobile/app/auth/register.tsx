import { useState } from 'react';
import { View, TextInput, Text, SafeAreaView, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/store/authStore';
import { useLanguageStore } from '@/src/store/languageStore';
import { t } from '@/src/i18n';
import { tokens } from '@/src/theme/tokens';
import { AppButton } from '@/src/components/AppButton';

export default function RegisterScreen() {
  useLanguageStore((s) => s.locale);
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (!firstName.trim()) { setError(t('auth.error.firstNameRequired')); return; }
    if (!email.trim()) { setError(t('auth.error.emailRequired')); return; }
    if (!password.trim()) { setError(t('auth.error.passwordRequired')); return; }
    try {
      await register({ email, password, first_name: firstName, last_name: lastName, phone: phone || undefined });
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? t('auth.error.registerFailed'));
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
      <ScrollView contentContainerStyle={{ padding: tokens.spacing.lg, gap: tokens.spacing.md }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: tokens.fontSize.xxl, fontWeight: tokens.fontWeight.bold, color: tokens.colors.text }}>{t('auth.createAccount')}</Text>
        <TextInput
          placeholder={t('auth.firstName.placeholder')}
          placeholderTextColor={tokens.colors.textMuted}
          value={firstName}
          onChangeText={setFirstName}
          style={inputStyle}
        />
        <TextInput
          placeholder={t('auth.lastName.placeholder')}
          placeholderTextColor={tokens.colors.textMuted}
          value={lastName}
          onChangeText={setLastName}
          style={inputStyle}
        />
        <TextInput
          placeholder={t('auth.emailRequired.placeholder')}
          placeholderTextColor={tokens.colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={inputStyle}
        />
        <TextInput
          placeholder={t('auth.phone.placeholder')}
          placeholderTextColor={tokens.colors.textMuted}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          style={inputStyle}
        />
        <TextInput
          placeholder={t('auth.passwordRequired.placeholder')}
          placeholderTextColor={tokens.colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={inputStyle}
        />
        {error ? <Text style={{ color: tokens.colors.danger }}>{error}</Text> : null}
        <AppButton title={t('auth.createAccount')} onPress={onSubmit} loading={isLoading} />
        <AppButton
          title={t('auth.haveAccount')}
          variant="secondary"
          onPress={() => router.replace('/auth/login')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
