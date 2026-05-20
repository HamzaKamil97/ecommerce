import { Stack } from 'expo-router';
import { t } from '@/src/i18n';
import { useLanguageStore } from '@/src/store/languageStore';

export default function AuthLayout() {
  useLanguageStore((s) => s.locale);
  return (
    <Stack>
      <Stack.Screen name="login" options={{ title: 'Log in' }} />
      <Stack.Screen name="register" options={{ title: 'Create account' }} />
      <Stack.Screen name="forgot" options={{ title: t('auth.forgotTitle'), headerShown: true }} />
    </Stack>
  );
}
