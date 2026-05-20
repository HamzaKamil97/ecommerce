import { useState } from 'react';
import { View, TextInput, Text, SafeAreaView, Pressable, KeyboardAvoidingView, Platform, StyleSheet, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/src/store/authStore';
import { useLanguageStore } from '@/src/store/languageStore';
import { t } from '@/src/i18n';
import { tokens } from '@/src/theme/tokens';
import { AppButton } from '@/src/components/AppButton';

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export default function LoginScreen() {
  useLanguageStore((s) => s.locale);
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (!email.trim()) e.email = t('auth.validation.emailRequired');
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) e.email = t('auth.validation.emailInvalid');
    if (!password) e.password = t('auth.validation.passwordRequired');
    return e;
  };

  const onSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (err: any) {
      setErrors({ general: err?.response?.data?.message ?? err?.message ?? t('auth.login.errorTitle') });
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{t('auth.welcomeBack')}</Text>

          <View style={{ gap: 4 }}>
            <TextInput
              placeholder={t('auth.email.placeholder')}
              placeholderTextColor={tokens.colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              style={[styles.input, errors.email ? styles.inputError : null]}
            />
            {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}
          </View>

          <View style={{ gap: 4 }}>
            <View style={styles.pwdRow}>
              <TextInput
                placeholder={t('auth.password.placeholder')}
                placeholderTextColor={tokens.colors.textMuted}
                secureTextEntry={!showPwd}
                value={password}
                onChangeText={setPassword}
                style={[styles.input, errors.password ? styles.inputError : null, { flex: 1 }]}
              />
              <Pressable
                onPress={() => setShowPwd((v) => !v)}
                hitSlop={8}
                style={styles.pwdEye}
                accessibilityLabel={showPwd ? t('auth.hidePassword') : t('auth.showPassword')}
              >
                <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={22} color={tokens.colors.textMuted} />
              </Pressable>
            </View>
            {errors.password ? <Text style={styles.fieldError}>{errors.password}</Text> : null}
          </View>

          {errors.general ? <Text style={styles.generalError}>{errors.general}</Text> : null}

          <AppButton title={t('auth.login')} onPress={onSubmit} loading={isLoading} />
          <AppButton
            title={t('auth.needAccount')}
            variant="secondary"
            onPress={() => router.replace('/auth/register')}
          />

          <Pressable onPress={() => {}} style={{ alignSelf: 'center', marginTop: tokens.spacing.sm }}>
            <Text style={styles.forgotLink}>{t('auth.forgotPassword')}</Text>
          </Pressable>

          <Text style={styles.oauthHint}>{t('auth.oauthComing')}</Text>
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
  generalError: {
    color: tokens.colors.danger,
    backgroundColor: tokens.colors.danger + '14',
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    textAlign: 'center',
  },
  pwdRow: { flexDirection: 'row', alignItems: 'center' },
  pwdEye: { position: 'absolute', right: tokens.spacing.md, padding: 4 },
  forgotLink: { fontSize: tokens.fontSize.sm, color: tokens.colors.primary, fontWeight: tokens.fontWeight.semibold },
  oauthHint: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textMuted,
    textAlign: 'center',
    marginTop: tokens.spacing.lg,
  },
});
