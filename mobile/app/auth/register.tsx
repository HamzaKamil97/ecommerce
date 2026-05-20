import { useState } from 'react';
import { View, TextInput, Text, SafeAreaView, ScrollView, Pressable, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/src/store/authStore';
import { useLanguageStore } from '@/src/store/languageStore';
import { t } from '@/src/i18n';
import { tokens } from '@/src/theme/tokens';
import { AppButton } from '@/src/components/AppButton';

interface FormErrors {
  firstName?: string;
  email?: string;
  password?: string;
  general?: string;
}

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
  const [showPwd, setShowPwd] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (!firstName.trim()) e.firstName = t('auth.validation.firstNameRequired');
    if (!email.trim()) e.email = t('auth.validation.emailRequired');
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) e.email = t('auth.validation.emailInvalid');
    if (!password) e.password = t('auth.validation.passwordRequired');
    else if (password.length < 6) e.password = t('auth.validation.passwordShort');
    return e;
  };

  const onSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    try {
      await register({ email: email.trim(), password, first_name: firstName.trim(), last_name: lastName.trim(), phone: phone || undefined });
      router.replace('/(tabs)');
    } catch (err: any) {
      setErrors({ general: err?.response?.data?.message ?? err?.message ?? t('auth.register.errorTitle') });
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{t('auth.createAccount')}</Text>

          <Field
            placeholder={t('auth.firstName.placeholder')}
            value={firstName}
            onChangeText={setFirstName}
            error={errors.firstName}
          />
          <Field
            placeholder={t('auth.lastName.placeholder')}
            value={lastName}
            onChangeText={setLastName}
          />
          <Field
            placeholder={t('auth.emailRequired.placeholder')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            error={errors.email}
          />
          <Field
            placeholder={t('auth.phone.placeholder')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <PasswordField
            placeholder={t('auth.passwordRequired.placeholder')}
            value={password}
            onChangeText={setPassword}
            show={showPwd}
            onToggleShow={() => setShowPwd((v) => !v)}
            error={errors.password}
          />

          {errors.general ? <Text style={styles.generalError}>{errors.general}</Text> : null}

          <AppButton title={t('auth.createAccount')} onPress={onSubmit} loading={isLoading} />
          <AppButton
            title={t('auth.haveAccount')}
            variant="secondary"
            onPress={() => router.replace('/auth/login')}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface FieldProps {
  placeholder: string;
  value: string;
  onChangeText: (s: string) => void;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  error?: string;
}

function Field({ placeholder, value, onChangeText, autoCapitalize, keyboardType, error }: FieldProps) {
  return (
    <View style={{ gap: 4 }}>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={tokens.colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        style={[styles.input, error ? styles.inputError : null]}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

interface PasswordFieldProps {
  placeholder: string;
  value: string;
  onChangeText: (s: string) => void;
  show: boolean;
  onToggleShow: () => void;
  error?: string;
}

function PasswordField({ placeholder, value, onChangeText, show, onToggleShow, error }: PasswordFieldProps) {
  return (
    <View style={{ gap: 4 }}>
      <View style={styles.pwdRow}>
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={tokens.colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!show}
          style={[styles.input, error ? styles.inputError : null, { flex: 1 }]}
        />
        <Pressable
          onPress={onToggleShow}
          hitSlop={8}
          style={styles.pwdEye}
          accessibilityLabel={show ? t('auth.hidePassword') : t('auth.showPassword')}
        >
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={22} color={tokens.colors.textMuted} />
        </Pressable>
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
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
});
