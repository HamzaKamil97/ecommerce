import { useState } from 'react';
import { View, TextInput, Text, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/store/authStore';
import { useTheme } from '@/src/theme/useTheme';
import { AppButton } from '@/src/components/AppButton';

export default function LoginScreen() {
  const { colors, spacing, radius, typography } = useTheme();
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
      setError(e?.response?.data?.message ?? 'Login failed');
    }
  };

  const inputStyle = {
    backgroundColor: colors.surface,
    color: colors.text,
    padding: spacing.md,
    borderRadius: radius.md,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <Text style={[typography.title, { color: colors.text }]}>Welcome back</Text>
        <TextInput
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={inputStyle}
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={inputStyle}
        />
        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
        <AppButton title="Log in" onPress={onSubmit} loading={isLoading} />
        <AppButton
          title="Need an account? Register"
          variant="secondary"
          onPress={() => router.replace('/auth/register')}
        />
        <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg }]}>
          Google / Facebook login — coming soon
        </Text>
      </View>
    </SafeAreaView>
  );
}
