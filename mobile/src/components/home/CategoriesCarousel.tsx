import React from 'react'
import { View, Text, ScrollView, Image, Pressable, StyleSheet } from 'react-native'
import { tokens } from '@/src/theme/tokens'
import { SectionHeader } from './SectionHeader'

export interface Category {
  handle: string
  label: string
  iconUrl: string
}

interface Props {
  categories: Category[]
  onSelect: (cat: Category) => void
  onSeeAll?: () => void
}

export function CategoriesCarousel({ categories, onSelect, onSeeAll }: Props) {
  return (
    <View>
      <SectionHeader title="Categories" actionLabel="See all" onAction={onSeeAll} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((cat) => (
          <Pressable key={cat.handle} style={styles.item} onPress={() => onSelect(cat)}>
            <View style={styles.imgWrapper}>
              <Image source={{ uri: cat.iconUrl }} style={styles.img} resizeMode="cover" />
            </View>
            <Text style={styles.label} numberOfLines={1}>{cat.label}</Text>
          </Pressable>
        ))}
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
