import React from 'react'
import { View, Text, ScrollView, Image, Pressable, StyleSheet } from 'react-native'
import { tokens } from '@/src/theme/tokens'
import { t } from '@/src/i18n'
import { useLanguageStore } from '@/src/store/languageStore'
import type { Translations } from '@/src/i18n'
import { SectionHeader } from './SectionHeader'

export interface Category {
  handle: string
  label: string
  iconUrl: string
  nameKey?: string
}

interface Props {
  categories: Category[]
  onSelect: (cat: Category) => void
  onSeeAll?: () => void
}

export function CategoriesCarousel({ categories, onSelect, onSeeAll }: Props) {
  useLanguageStore((s) => s.locale)
  return (
    <View>
      <SectionHeader title={t('home.categories')} actionLabel={t('home.seeAll')} onAction={onSeeAll} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((cat) => {
          const label = cat.nameKey ? t(cat.nameKey as keyof Translations) : cat.label
          return (
            <Pressable key={cat.handle} style={styles.item} onPress={() => onSelect(cat)}>
              <View style={styles.imgWrapper}>
                <Image source={{ uri: cat.iconUrl }} style={styles.img} resizeMode="cover" />
              </View>
              <Text style={styles.label} numberOfLines={1}>{label}</Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.sm,
    gap: tokens.spacing.sm,
  },
  item: {
    width: 76,
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  imgWrapper: {
    width: 64,
    height: 64,
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  img: {
    width: 64,
    height: 64,
  },
  label: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.text,
    textAlign: 'center',
  },
})
