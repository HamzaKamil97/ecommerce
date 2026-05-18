import { useState } from 'react';
import { View, TextInput, Text, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/store/authStore';
import { useTheme } from '@/src/theme/useTheme';
import { AppButton } from '@/src/components/AppButton';

export default function RegisterScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    try {
      await register({ email, password, first_name: firstName, last_name: lastName });
      router.replace('/(tabs)/profile');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Registration failed');
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
        <Text style={[typography.title, { color: colors.text }]}>Create account</Text>
        <TextInput placeholder="First name" placeholderTextColor={colors.textMuted} value={firstName} onChangeText={setFirstName} style={inputStyle} />
        <TextInput placeholder="Last name" placeholderTextColor={colors.textMuted} value={lastName} onChangeText={setLastName} style={inputStyle} />
        <TextInput placeholder="Email" placeholderTextColor={colors.textMuted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} style={inputStyle} />
        <TextInput placeholder="Password" placeholderTextColor={colors.textMuted} secureTextEntry value={password} onChangeText={setPassword} style={inputStyle} />
        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
        <AppButton title="Create account" onPress={onSubmit} loading={isLoading} />
        <AppButton title="Already have an account? Log in" variant="secondary" onPress={() => router.replace('/auth/login')} />
      </View>
    </SafeAreaView>
  );
}
