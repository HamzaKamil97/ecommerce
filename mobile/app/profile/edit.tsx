import React, { useState } from 'react';
import { View, Text, TextInput, SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/store/authStore';
import { tokens } from '@/src/theme/tokens';
import { t } from '@/src/i18n';
import { useLanguageStore } from '@/src/store/languageStore';
import { AppButton } from '@/src/components/AppButton';

export default function EditProfileScreen() {
  useLanguageStore((s) => s.locale);
  const router = useRouter();
  const customer = useAuthStore((s) => s.customer);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [firstName, setFirstName] = useState(customer?.first_name ?? '');
  const [lastName, setLastName] = useState(customer?.last_name ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    if (!firstName.trim()) { setError(t('profile.edit.firstNameRequired')); return; }
    try {
      await updateProfile({ first_name: firstName, last_name: lastName, phone: phone || undefined });
      router.back();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? t('profile.edit.updateError'));
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>{t('profile.edit.section')}</Text>

        <View style={styles.fieldWrapper}>
          <Text style={styles.fieldLabel}>{t('profile.edit.firstName')}</Text>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            placeholder={t('profile.edit.firstNamePlaceholder')}
            placeholderTextColor={tokens.colors.textSubtle}
            style={styles.input}
          />
        </View>

        <View style={styles.fieldWrapper}>
          <Text style={styles.fieldLabel}>{t('profile.edit.lastName')}</Text>
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            placeholder={t('profile.edit.lastNamePlaceholder')}
            placeholderTextColor={tokens.colors.textSubtle}
            style={styles.input}
          />
        </View>

        <View style={styles.fieldWrapper}>
          <Text style={styles.fieldLabel}>{t('profile.edit.email')}</Text>
          <TextInput
            value={customer?.email ?? ''}
            editable={false}
            style={[styles.input, styles.inputDisabled]}
          />
          <Text style={styles.hint}>{t('profile.edit.emailHint')}</Text>
        </View>

        <View style={styles.fieldWrapper}>
          <Text style={styles.fieldLabel}>{t('profile.edit.phone')}</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder={t('profile.edit.phonePlaceholder')}
            placeholderTextColor={tokens.colors.textSubtle}
            keyboardType="phone-pad"
            style={styles.input}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <AppButton title={t('profile.edit.save')} onPress={handleSave} loading={isLoading} />
        <AppButton title={t('common.cancel')} variant="secondary" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: tokens.colors.bg },
  scroll: { padding: tokens.spacing.lg, gap: tokens.spacing.md, paddingBottom: 80 },
  sectionLabel: {
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.sm,
  },
  fieldWrapper: { gap: 4 },
  fieldLabel: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: tokens.colors.surface,
    color: tokens.colors.text,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    fontSize: tokens.fontSize.base,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  inputDisabled: {
    color: tokens.colors.textMuted,
    backgroundColor: tokens.colors.surfaceAlt,
  },
  hint: { fontSize: tokens.fontSize.xs, color: tokens.colors.textSubtle },
  errorText: { color: tokens.colors.danger, fontSize: tokens.fontSize.sm },
});
