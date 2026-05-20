import React, { useState } from 'react'
import { SafeAreaView, ScrollView, View, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useCartStore } from '@/src/store/cartStore'
import { useAuthToken } from '@/src/hooks/useAuthToken'
import { tokens } from '@/src/theme/tokens'
import { t } from '@/src/i18n'
import { useLanguageStore } from '@/src/store/languageStore'

import { TopBar } from '@/src/components/home/TopBar'
import { SearchBox } from '@/src/components/home/SearchBox'
import { FilterSheet } from '@/src/components/home/FilterSheet'
import { ContentSection } from '@/src/components/home/ContentSection'
import { LanguagePicker } from '@/src/components/LanguagePicker'
import { DEMO_HOME_LAYOUT } from '@/src/data/homeLayout'

export default function HomeScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const itemCount: number = useCartStore((s) => s.itemCount())
  const token = useAuthToken()
  useLanguageStore((s) => s.locale)
  const [filterOpen, setFilterOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)

  function onLocationPress() {
    if (token) {
      router.push('/addresses' as never)
    } else {
      Alert.alert(t('home.signInForAddresses'))
    }
  }

  function onSelectShop(slug: string) {
    router.push(`/shops/${slug}`)
  }

  function onSelectProduct(productId: string) {
    router.push(`/products/${productId}` as never)
  }

  function onSelectCategory(_handle: string) {
    router.push('/(tabs)/shops' as never)
  }

  function onSeeAll(route?: string) {
    if (route) router.push(route as never)
    else router.push('/(tabs)/shops' as never)
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: tokens.colors.primary }]}>
      <View style={[styles.brandBand, { paddingTop: insets.top }]}>
        <TopBar
          tone="light"
          location={t('home.deliverTo', { city: 'Baghdad' })}
          cartCount={itemCount}
          onCart={() => router.push('/(tabs)/cart')}
          onLocation={onLocationPress}
          onLanguage={() => setLangOpen(true)}
        />
      </View>

      <View style={styles.body}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.searchWrapper}>
            <SearchBox
              placeholder={t('home.searchPlaceholder')}
              onPress={() => router.push('/(tabs)/shops' as never)}
              onFilter={() => setFilterOpen(true)}
            />
          </View>

          {DEMO_HOME_LAYOUT.slots.map((slot) => (
            <ContentSection
              key={slot.id}
              slot={slot}
              onSelectShop={onSelectShop}
              onSelectProduct={onSelectProduct}
              onSelectCategory={onSelectCategory}
              onSeeAll={onSeeAll}
            />
          ))}
        </ScrollView>
      </View>

      <FilterSheet visible={filterOpen} onClose={() => setFilterOpen(false)} />
      <LanguagePicker visible={langOpen} onClose={() => setLangOpen(false)} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  brandBand: { backgroundColor: tokens.colors.primary },
  body: { flex: 1, backgroundColor: tokens.colors.bg },
  scrollContent: { paddingBottom: 96 },
  searchWrapper: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
  },
})
