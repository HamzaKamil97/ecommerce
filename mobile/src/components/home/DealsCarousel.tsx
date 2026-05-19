import React from 'react'
import { View, Text, ScrollView, Image, Pressable, StyleSheet } from 'react-native'
import { tokens } from '@/src/theme/tokens'
import { SectionHeader } from './SectionHeader'
import { t } from '@/src/i18n'

export interface Deal {
  id: string
  title: string
  subtitle: string
  imageUrl: string
  /** e.g., "30% off", "BOGO", "Free Delivery" — shown as a colored pill overlay. */
  badge: string
}

interface Props {
  deals: Deal[]
  onSelect: (deal: Deal) => void
  onSeeAll?: () => void
  title?: string
}

/**
 * Image-card deals carousel that mirrors FeaturedShopsCarousel's visual
 * pattern. Admin (later) can swap content; visitors see deals just like
 * they see featured shops. Replaces the earlier flat colored boxes.
 */
export function DealsCarousel({ deals, onSelect, onSeeAll, title }: Props) {
  const resolvedTitle = title ?? t('home.topDeals')
  return (
    <View>
      <SectionHeader title={resolvedTitle} actionLabel={t('home.seeAll')} onAction={onSeeAll} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {deals.map((deal) => (
          <Pressable key={deal.id} style={styles.card} onPress={() => onSelect(deal)}>
            <View style={styles.coverWrapper}>
              <Image source={{ uri: deal.imageUrl }} style={styles.cover} resizeMode="cover" />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{deal.badge}</Text>
              </View>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.title} numberOfLines={1}>{deal.title}</Text>
              <Text style={styles.subtitle} numberOfLines={2}>{deal.subtitle}</Text>
            </View>
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
    gap: tokens.spacing.md,
  },
  card: {
    width: 280,
    backgroundColor: tokens.colors.bg,
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: tokens.colors.border,
    ...tokens.shadow.card,
  },
  coverWrapper: {
    height: 100,
    position: 'relative',
  },
  cover: {
    width: '100%',
    height: 100,
  },
  badge: {
    position: 'absolute',
    top: tokens.spacing.sm,
    left: tokens.spacing.sm,
    backgroundColor: tokens.colors.accent,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.extrabold,
    color: tokens.colors.text,
  },
  cardBody: {
    padding: tokens.spacing.md,
    gap: tokens.spacing.xs,
  },
  title: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  subtitle: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textMuted,
  },
})
