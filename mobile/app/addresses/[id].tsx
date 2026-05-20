import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, SafeAreaView, ScrollView,
  ActivityIndicator, StyleSheet, Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { tokens } from '@/src/theme/tokens';
import { t } from '@/src/i18n';
import { useLanguageStore } from '@/src/store/languageStore';
import { AppButton } from '@/src/components/AppButton';
import * as addressApi from '@/src/api/addresses';
import type { AddressInput } from '@/src/api/addresses';

const EMPTY: AddressInput = {
  label: '',
  recipient_name: '',
  phone: '',
  street: '',
  building: '',
  apartment: '',
  city: '',
  region: '',
  country_code: 'IQ',
  delivery_instructions: '',
  is_default: false,
};

export default function AddressFormScreen() {
  useLanguageStore((s) => s.locale);
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const router = useRouter();
  const navigation = useNavigation();

  const [form, setForm] = useState<AddressInput>(EMPTY);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: isNew ? t('addresses.form.newTitle') : t('addresses.form.editTitle') });
  }, [isNew, navigation]);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      try {
        const list = await addressApi.listAddresses();
        const found = list.find((a) => a.id === id);
        if (found) {
          setForm({
            label: found.label ?? '',
            recipient_name: found.recipient_name ?? '',
            phone: found.phone ?? '',
            street: found.street,
            building: found.building ?? '',
            apartment: found.apartment ?? '',
            city: found.city,
            region: found.region ?? '',
            country_code: found.country_code,
            delivery_instructions: found.delivery_instructions ?? '',
            is_default: found.is_default,
          });
        }
      } catch {
        setError(t('addresses.form.loadError'));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isNew]);

  const set = (key: keyof AddressInput, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setError(null);
    if (!form.street.trim()) { setError(t('addresses.form.streetRequired')); return; }
    if (!form.city.trim()) { setError(t('addresses.form.cityRequired')); return; }
    setSaving(true);
    try {
      const payload: AddressInput = {
        ...form,
        country_code: form.country_code || 'IQ',
        label: form.label || null,
        recipient_name: form.recipient_name || null,
        phone: form.phone || null,
        building: form.building || null,
        apartment: form.apartment || null,
        region: form.region || null,
        delivery_instructions: form.delivery_instructions || null,
      };
      if (isNew) {
        await addressApi.createAddress(payload);
      } else {
        await addressApi.updateAddress(id!, payload);
      }
      router.replace('/addresses');
    } catch (e: any) {
      setError(e?.response?.data?.error ?? t('addresses.form.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <ActivityIndicator style={{ flex: 1 }} color={tokens.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Field label={t('addresses.form.label')} value={form.label as string} onChangeText={(v) => set('label', v)} placeholder={t('addresses.form.labelPlaceholder')} />
        <Field label={t('addresses.form.recipient')} value={form.recipient_name as string} onChangeText={(v) => set('recipient_name', v)} placeholder={t('addresses.form.recipientPlaceholder')} />
        <Field label={t('addresses.form.phone')} value={form.phone as string} onChangeText={(v) => set('phone', v)} placeholder={t('addresses.form.phonePlaceholder')} keyboardType="phone-pad" />
        <Field label={t('addresses.form.street')} value={form.street} onChangeText={(v) => set('street', v)} placeholder={t('addresses.form.streetPlaceholder')} />
        <Field label={t('addresses.form.building')} value={form.building as string} onChangeText={(v) => set('building', v)} placeholder={t('addresses.form.buildingPlaceholder')} />
        <Field label={t('addresses.form.apartment')} value={form.apartment as string} onChangeText={(v) => set('apartment', v)} placeholder={t('addresses.form.apartmentPlaceholder')} />
        <Field label={t('addresses.form.city')} value={form.city} onChangeText={(v) => set('city', v)} placeholder={t('addresses.form.cityPlaceholder')} />
        <Field label={t('addresses.form.instructions')} value={form.delivery_instructions as string} onChangeText={(v) => set('delivery_instructions', v)} placeholder={t('addresses.form.instructionsPlaceholder')} multiline />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{t('addresses.form.setDefault')}</Text>
          <Switch
            value={!!form.is_default}
            onValueChange={(v) => set('is_default', v)}
            trackColor={{ true: tokens.colors.primary }}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <AppButton title={isNew ? t('addresses.form.saveNew') : t('addresses.form.saveUpdate')} onPress={handleSave} loading={saving} />
        <AppButton title={t('common.cancel')} variant="secondary" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label, value, onChangeText, placeholder, keyboardType, multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={tokens.colors.textSubtle}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[styles.input, multiline && { minHeight: 72, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: tokens.colors.bg },
  scroll: { padding: tokens.spacing.lg, gap: tokens.spacing.md, paddingBottom: 80 },
  fieldWrapper: { gap: 4 },
  fieldLabel: { fontSize: tokens.fontSize.xs, fontWeight: tokens.fontWeight.semibold, color: tokens.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: tokens.colors.surface,
    color: tokens.colors.text,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    fontSize: tokens.fontSize.base,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: tokens.spacing.sm },
  switchLabel: { fontSize: tokens.fontSize.base, color: tokens.colors.text },
  errorText: { color: tokens.colors.danger, fontSize: tokens.fontSize.sm },
});
