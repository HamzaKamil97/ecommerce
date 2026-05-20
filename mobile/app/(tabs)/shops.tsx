import React, { useState, useMemo } from 'react'
import { View, Text, TextInput, ScrollView, SafeAreaView, Pressable, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { tokens } from '@/src/theme/tokens'
import { FilterChips, ChipDef } from '@/src/components/FilterChips'
import { ShopRow } from '@/src/components/home/ShopRow'
import { EmptyState } from '@/src/components/EmptyState'
import { DEMO_SHOPS } from '@/src/components/home/demo-data'

const RECENT_SEARCHES = ['Pizza', 'Iced coffee', 'Headphones', 'Fresh milk', 'Electronics']

const INITIAL_CHIPS: ChipDef[] = [
  { id: 'all', label: 'All', active: true },
  { id: 'food', label: 'Food', active: false },
  { id: 'grocery', label: 'Grocery', active: false },
  { id: 'fast-delivery', label: 'Fast delivery', active: false, prefix: '⚡' },
  { id: 'open', label: 'Open now', active: false },
]

export default function SearchScreen() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [chips, setChips] = useState<ChipDef[]>(INITIAL_CHIPS)

  const activeChip = chips.find((c) => c.active)?.id ?? 'all'

  function toggleChip(id: string) {
    setChips((prev) => prev.map((c) => ({ ...c, active: c.id === id })))
  }

  const filtered = useMemo(() => {
    let results = DEMO_SHOPS
    if (query.trim()) {
      const q = query.toLowerCase()
      results = results.filter(
        (s) => s.name.toLowerCase().includes(q) || s.vertical.toLowerCase().includes(q)
      )
    }
    if (activeChip === 'food') results = results.filter((s) => s.vertical === 'Food')
    if (activeChip === 'grocery') results = results.filter((s) => s.vertical === 'Grocery')
    if (activeChip === 'fast-delivery') results = results.filter((s) => s.deliveryMinutes <= 30)
    if (activeChip === 'open') results = results.filter((s) => s.isOpen)
    return results
  }, [query, activeChip])

  const hasQuery = query.trim().length > 0

  return (
    <SafeAreaView style={styles.root}>
      {/* Search input */}
      <View style={styles.searchHeader}>
        <Text style={styles.heading}>Search</Text>
        <View style={styles.searchPill}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Shops, food, categories…"
            placeholderTextColor={tokens.colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            numberOfLines={1}
            multiline={false}
          />
          {hasQuery && (
            <Pressable onPress={() => setQuery('')} hitSlop={8} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>✕</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => {}}
            hitSlop={8}
            style={styles.filterBtn}
          >
            <Text style={styles.filterIcon}>≡</Text>
          </Pressable>
        </View>
      </View>

      {/* Filter chips */}
      <FilterChips chips={chips} onPress={toggleChip} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {!hasQuery && (
          <>
            <Text style={styles.sectionLabel}>Recent searches</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentRow}
            >
              {RECENT_SEARCHES.map((term) => (
                <Pressable
                  key={term}
                  onPress={() => setQuery(term)}
                  style={({ pressed }) => [styles.recentPill, { opacity: pressed ? 0.8 : 1 }]}
                >
                  <Text style={styles.recentText}>{term}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.sectionLabel}>All shops</Text>
          </>
        )}

        {filtered.length === 0 ? (
          <View style={styles.emptyWrapper}>
            <EmptyState
              title="No results"
              subtitle={`No shops found for "${query}"`}
            />
          </View>
        ) : (
          filtered.map((shop) => (
            <ShopRow
              key={shop.slug}
              shop={shop}
              onPress={() => router.push(`/shops/${shop.slug}`)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
  searchHeader: {
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.sm,
    paddingBottom: tokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
  },
  heading: {
    fontSize: tokens.fontSize.xl,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.sm,
  },
  searchPill: {
    height: 48,
    maxHeight: 48,
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    gap: tokens.spacing.sm,
    overflow: 'hidden',
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: tokens.fontSize.base,
    color: tokens.colors.text,
    padding: 0,
  },
  clearBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: tokens.colors.textSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    fontSize: 10,
    color: tokens.colors.white,
    fontWeight: tokens.fontWeight.bold,
  },
  filterBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: tokens.colors.border,
  },
  filterIcon: {
    fontSize: 18,
    color: tokens.colors.textMuted,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 80,
  },
  sectionLabel: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.sm,
  },
  recentRow: {
    paddingHorizontal: tokens.spacing.lg,
    gap: tokens.spacing.sm,
    paddingBottom: tokens.spacing.sm,
  },
  recentPill: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  recentText: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.text,
  },
  emptyWrapper: {
    paddingTop: tokens.spacing.xxxl,
  },
})
