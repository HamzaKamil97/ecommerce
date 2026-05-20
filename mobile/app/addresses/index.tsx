import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, SafeAreaView, Pressable, Alert,
  ActivityIndicator, StyleSheet, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { tokens } from '@/src/theme/tokens';
import { t } from '@/src/i18n';
import { useLanguageStore } from '@/src/store/languageStore';
import * as addressApi from '@/src/api/addresses';
import type { Address } from '@/src/api/addresses';

export default function AddressListScreen() {
  useLanguageStore((s) => s.locale);
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await addressApi.listAddresses();
      setAddresses(list);
    } catch {
      // silently fail — user sees empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const handleDelete = (id: string) => {
    Alert.alert(t('addresses.deleteConfirm.title'), t('addresses.deleteConfirm.message'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'), style: 'destructive', onPress: async () => {
          await addressApi.deleteAddress(id);
          setAddresses((prev) => prev.filter((a) => a.id !== id));
        },
      },
    ]);
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
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {addresses.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📍</Text>
            <Text style={styles.emptyTitle}>{t('addresses.empty.title')}</Text>
            <Text style={styles.emptySubtitle}>{t('addresses.empty.subtitle')}</Text>
          </View>
        ) : (
          addresses.map((addr) => (
            <View key={addr.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.label}>{addr.label ?? t('addresses.addressFallback')}</Text>
                {addr.is_default ? <Text style={styles.defaultBadge}>{t('addresses.default')}</Text> : null}
              </View>
              {addr.recipient_name ? <Text style={styles.recipient}>{addr.recipient_name}</Text> : null}
              <Text style={styles.addressText}>
                {[addr.street, addr.building, addr.apartment, addr.city].filter(Boolean).join(', ')}
              </Text>
              {addr.phone ? <Text style={styles.phone}>{addr.phone}</Text> : null}
              {addr.delivery_instructions ? (
                <Text style={styles.notes}>{t('addresses.noteLabel', { note: addr.delivery_instructions })}</Text>
              ) : null}
              <View style={styles.actions}>
                <Pressable
                  onPress={() => router.push(`/addresses/${addr.id}`)}
                  style={({ pressed }) => [styles.editBtn, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text style={styles.editBtnText}>{t('addresses.edit')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleDelete(addr.id)}
                  style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text style={styles.deleteBtnText}>{t('addresses.delete')}</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <Pressable
          onPress={() => router.push('/addresses/new')}
          style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.8 : 1 }]}
        >
          <Text style={styles.addBtnText}>{t('addresses.addNew')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: tokens.colors.bg },
  scroll: { padding: tokens.spacing.lg, gap: tokens.spacing.md, paddingBottom: 80 },
  emptyBox: { alignItems: 'center', paddingVertical: tokens.spacing.xxxl, gap: tokens.spacing.sm },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.bold, color: tokens.colors.text },
  emptySubtitle: { fontSize: tokens.fontSize.base, color: tokens.colors.textMuted, textAlign: 'center' },
  card: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.xs,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm, marginBottom: 2 },
  label: { fontSize: tokens.fontSize.base, fontWeight: tokens.fontWeight.bold, color: tokens.colors.text },
  defaultBadge: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.primary,
    backgroundColor: '#E6F4F3',
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: tokens.radius.pill,
  },
  recipient: { fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.medium, color: tokens.colors.text },
  addressText: { fontSize: tokens.fontSize.sm, color: tokens.colors.textMuted },
  phone: { fontSize: tokens.fontSize.sm, color: tokens.colors.textMuted },
  notes: { fontSize: tokens.fontSize.xs, color: tokens.colors.textSubtle, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: tokens.spacing.sm, marginTop: tokens.spacing.sm },
  editBtn: {
    flex: 1,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.primary,
    alignItems: 'center',
  },
  editBtnText: { fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.semibold, color: tokens.colors.primary },
  deleteBtn: {
    flex: 1,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.danger,
    alignItems: 'center',
  },
  deleteBtnText: { fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.semibold, color: tokens.colors.danger },
  addBtn: {
    marginTop: tokens.spacing.sm,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.primary,
    alignItems: 'center',
  },
  addBtnText: { fontSize: tokens.fontSize.base, fontWeight: tokens.fontWeight.bold, color: tokens.colors.white },
});
