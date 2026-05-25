import { useEffect, useState } from 'react';
import { View, TextInput, Text, SafeAreaView, KeyboardAvoidingView, Platform, StyleSheet, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useLanguageStore } from '@/src/store/languageStore';
import { useChromeStore } from '@/src/store/chromeStore';
import { t } from '@/src/i18n';
import { tokens } from '@/src/theme/tokens';
import { AppButton } from '@/src/components/AppButton';
import { showToast } from '@/src/components/Toast';

export default function ForgotPasswordScreen() {
  useLanguageStore((s) => s.locale);
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Hide the Najma FAB on auth screens.
  useEffect(() => {
    useChromeStore.getState().setNajmaFabHidden(true);
    return () => useChromeStore.getState().setNajmaFabHidden(false);
  }, []);

  const onSubmit = () => {
    if (!email.trim()) {
      setError(t('auth.validation.emailRequired'));
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError(t('auth.validation.emailInvalid'));
      return;
    }
    setError(null);
    showToast({ message: t('auth.forgotAck'), duration: 2400 });
    router.back();
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{t('auth.forgotHeading')}</Text>
          <Text style={styles.subtitle}>{t('auth.forgotSubtitle')}</Text>

          <View style={{ gap: 4 }}>
            <TextInput
              placeholder={t('auth.email.placeholder')}
              placeholderTextColor={tokens.colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={(v) => { setEmail(v); if (error) setError(null); }}
              style={[styles.input, error ? styles.inputError : null]}
            />
            {error ? <Text style={styles.fieldError}>{error}</Text> : null}
          </View>

          <AppButton title={t('auth.forgotSubmit')} onPress={onSubmit} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: tokens.colors.bg },
  content: { padding: tokens.spacing.lg, gap: tokens.spacing.md },
  title: {
    fontSize: tokens.fontSize.xxl,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  subtitle: {
    fontSize: tokens.fontSize.base,
    color: tokens.colors.textMuted,
    marginBottom: tokens.spacing.sm,
  },
  input: {
    backgroundColor: tokens.colors.surface,
    color: tokens.colors.text,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  inputError: { borderColor: tokens.colors.danger },
  fieldError: { color: tokens.colors.danger, fontSize: tokens.fontSize.sm, paddingHorizontal: 2 },
});
