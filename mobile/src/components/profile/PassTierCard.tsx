import React from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native'
import { tokens } from '@/src/theme/tokens'
import { t } from '@/src/i18n'
import { useLanguageStore } from '@/src/store/languageStore'

export type PassTierId = 'fidda' | 'dhahab' | 'khass'

interface Props {
  onSelectTier: (tier: 'dhahab' | 'khass') => void
}

interface TierVisual {
  id: PassTierId
  icon: string
  nameKey: 'pass.fidda.name' | 'pass.dhahab.name' | 'pass.khass.name'
  priceText: () => string
  perkKeys: [string, string, string]
  bg: string
  bgOverlay?: string
  textColor: string
  subTextColor: string
  badgeBg: string
  badgeText: string
  badgeLabelKey: 'pass.active' | 'pass.comingSoon'
}

const TIERS: TierVisual[] = [
  {
    id: 'fidda',
    icon: '🥈',
    nameKey: 'pass.fidda.name',
    priceText: () => t('pass.priceFree'),
    perkKeys: ['pass.fidda.perk1', 'pass.fidda.perk2', 'pass.fidda.perk3'],
    bg: tokens.colors.surface,
    textColor: tokens.colors.text,
    subTextColor: tokens.colors.textMuted,
    badgeBg: tokens.colors.primary,
    badgeText: tokens.colors.white,
    badgeLabelKey: 'pass.active',
  },
  {
    id: 'dhahab',
    icon: '👑',
    nameKey: 'pass.dhahab.name',
    priceText: () => t('pass.pricePerMonth', { amount: '15,000' }),
    perkKeys: ['pass.dhahab.perk1', 'pass.dhahab.perk2', 'pass.dhahab.perk3'],
    bg: tokens.colors.primary,
    bgOverlay: tokens.colors.primaryDark,
    textColor: tokens.colors.white,
    subTextColor: 'rgba(255,255,255,0.85)',
    badgeBg: tokens.colors.surface,
    badgeText: tokens.colors.text,
    badgeLabelKey: 'pass.comingSoon',
  },
  {
    id: 'khass',
    icon: '💎',
    nameKey: 'pass.khass.name',
    priceText: () => t('pass.pricePerMonth', { amount: '39,000' }),
    perkKeys: ['pass.khass.perk1', 'pass.khass.perk2', 'pass.khass.perk3'],
    bg: tokens.colors.text,
    textColor: tokens.colors.accentSoft,
    subTextColor: 'rgba(233,217,179,0.78)',
    badgeBg: tokens.colors.surface,
    badgeText: tokens.colors.text,
    badgeLabelKey: 'pass.comingSoon',
  },
]

export function PassTierCard({ onSelectTier }: Props) {
  useLanguageStore((s) => s.locale)

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('pass.title')}</Text>
      <Text style={styles.subtitle}>{t('pass.subtitle')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={296}
      >
        {TIERS.map((tier) => {
          const isLocked = tier.id !== 'fidda'
          const handlePress = () => {
            if (isLocked) onSelectTier(tier.id as 'dhahab' | 'khass')
          }
          return (
            <Pressable
              key={tier.id}
              onPress={handlePress}
              style={({ pressed }) => {
                const opacity = pressed && isLocked ? 0.92 : 1
                return [styles.card, { backgroundColor: tier.bg, opacity }]
              }}
            >
              {tier.bgOverlay ? (
                <View style={[styles.overlay, { backgroundColor: tier.bgOverlay }]} pointerEvents="none" />
              ) : null}

              <View style={styles.cardHeader}>
                <View style={styles.iconRow}>
                  <Text style={styles.iconText}>{tier.icon}</Text>
                  <Text style={[styles.tierName, { color: tier.textColor }]} numberOfLines={1}>
                    {t(tier.nameKey)}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: tier.badgeBg }]}>
                  <Text style={[styles.badgeText, { color: tier.badgeText }]}>
                    {t(tier.badgeLabelKey)}
                  </Text>
                </View>
              </View>

              <Text style={[styles.price, { color: tier.textColor }]}>{tier.priceText()}</Text>

              <View style={styles.perksList}>
                {tier.perkKeys.map((key) => (
                  <View key={key} style={styles.perkRow}>
                    <Text style={[styles.perkDot, { color: tier.subTextColor }]}>•</Text>
                    <Text style={[styles.perkText, { color: tier.subTextColor }]} numberOfLines={2}>
                      {t(key as 'pass.fidda.perk1')}
                    </Text>
                  </View>
                ))}
              </View>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: tokens.spacing.xs,
    paddingBottom: tokens.spacing.md,
  },
  title: {
    fontSize: tokens.fontSize.lg,
    fontFamily: tokens.fontFamily.display,
    fontWeight: tokens.fontWeight.extrabold,
    color: tokens.colors.text,
    paddingHorizontal: tokens.spacing.lg,
  },
  subtitle: {
    fontSize: tokens.fontSize.sm,
    fontFamily: tokens.fontFamily.body,
    color: tokens.colors.textMuted,
    paddingHorizontal: tokens.spacing.lg,
    marginTop: 2,
    marginBottom: tokens.spacing.md,
  },
  scrollContent: {
    paddingHorizontal: tokens.spacing.lg,
    gap: tokens.spacing.md,
  },
  card: {
    width: 280,
    height: 200,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    overflow: 'hidden',
    ...tokens.shadow.card,
  },
  overlay: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.35,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.sm,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    flexShrink: 1,
  },
  iconText: {
    fontSize: 18,
  },
  tierName: {
    fontSize: tokens.fontSize.md,
    fontFamily: tokens.fontFamily.bold,
    fontWeight: tokens.fontWeight.bold,
  },
  badge: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 3,
    borderRadius: tokens.radius.pill,
  },
  badgeText: {
    fontSize: tokens.fontSize.xs,
    fontFamily: tokens.fontFamily.semibold,
    fontWeight: tokens.fontWeight.semibold,
  },
  price: {
    fontSize: tokens.fontSize.lg,
    fontFamily: tokens.fontFamily.monoBold,
    fontWeight: tokens.fontWeight.bold,
    marginBottom: tokens.spacing.sm,
  },
  perksList: {
    gap: 4,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.spacing.xs,
  },
  perkDot: {
    fontSize: tokens.fontSize.base,
    lineHeight: 18,
  },
  perkText: {
    flex: 1,
    fontSize: tokens.fontSize.sm,
    fontFamily: tokens.fontFamily.body,
    lineHeight: 18,
  },
})
