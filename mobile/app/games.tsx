import React from 'react'
import { SafeAreaView, ScrollView, View, Text, Pressable, StyleSheet } from 'react-native'
import { useRouter, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { tokens } from '@/src/theme/tokens'
import { t } from '@/src/i18n'
import { useLanguageStore } from '@/src/store/languageStore'

type IconName = React.ComponentProps<typeof Ionicons>['name']

interface GameTile {
  id: string
  route: string
  icon: IconName
  nameKey: 'games.soukWheel.name' | 'games.recipe.name' | 'games.chefsRace.name' | 'games.guessPrice.name' | 'games.predictArrival.name' | 'games.soukStories.name' | 'games.voiceMemo.name' | 'games.prepAlong.name' | 'games.playlist.name'
  taglineKey?: 'games.soukWheel.tagline' | 'games.recipe.tagline' | 'games.chefsRace.comingSoon' | 'games.guessPrice.comingSoon' | 'games.predictArrival.comingSoon' | 'games.soukStories.comingSoon' | 'games.voiceMemo.comingSoon' | 'games.prepAlong.comingSoon' | 'games.playlist.comingSoon'
  locked: boolean
}

const TILES: GameTile[] = [
  { id: 'souk-wheel', route: '/games/souk-wheel', icon: 'sync-circle', nameKey: 'games.soukWheel.name', taglineKey: 'games.soukWheel.tagline', locked: false },
  { id: 'recipe', route: '/games/recipe', icon: 'restaurant-outline', nameKey: 'games.recipe.name', taglineKey: 'games.recipe.tagline', locked: false },
  { id: 'chefs-race', route: '/games/chefs-race', icon: 'flame', nameKey: 'games.chefsRace.name', taglineKey: 'games.chefsRace.comingSoon', locked: true },
  { id: 'guess-price', route: '/games/guess-price', icon: 'pricetag', nameKey: 'games.guessPrice.name', taglineKey: 'games.guessPrice.comingSoon', locked: true },
  { id: 'predict-arrival', route: '/games/predict-arrival', icon: 'time', nameKey: 'games.predictArrival.name', taglineKey: 'games.predictArrival.comingSoon', locked: true },
  { id: 'souk-stories', route: '/games/souk-stories', icon: 'book', nameKey: 'games.soukStories.name', taglineKey: 'games.soukStories.comingSoon', locked: true },
  { id: 'voice-memo', route: '/games/voice-memo', icon: 'mic', nameKey: 'games.voiceMemo.name', taglineKey: 'games.voiceMemo.comingSoon', locked: true },
  { id: 'prep-along', route: '/games/prep-along', icon: 'restaurant', nameKey: 'games.prepAlong.name', taglineKey: 'games.prepAlong.comingSoon', locked: true },
  { id: 'playlist', route: '/games/playlist', icon: 'musical-notes', nameKey: 'games.playlist.name', taglineKey: 'games.playlist.comingSoon', locked: true },
]

export default function GamesHubScreen() {
  useLanguageStore((s) => s.locale)
  const router = useRouter()

  return (
    <SafeAreaView style={styles.root}>
      <Stack.Screen options={{ title: t('games.hubTitle') }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('games.hubTitle')}</Text>
          <Text style={styles.subtitle}>{t('games.hubSubtitle')}</Text>
        </View>

        <View style={styles.grid}>
          {TILES.map((tile) => (
            <Pressable
              key={tile.id}
              onPress={() => router.push(tile.route as never)}
              style={({ pressed }) => [
                styles.tile,
                tile.locked && styles.tileLocked,
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={[styles.iconCircle, tile.locked && styles.iconCircleLocked]}>
                <Ionicons
                  name={tile.icon}
                  size={32}
                  color={tile.locked ? tokens.colors.textMuted : tokens.colors.primary}
                />
              </View>
              <Text style={styles.tileName} numberOfLines={1}>
                {t(tile.nameKey)}
              </Text>
              {tile.taglineKey ? (
                <Text style={styles.tileTagline} numberOfLines={2}>
                  {t(tile.taglineKey)}
                </Text>
              ) : null}
              <View style={[styles.pill, tile.locked ? styles.pillLocked : styles.pillActive]}>
                <Text style={[styles.pillText, tile.locked && styles.pillTextLocked]}>
                  {tile.locked ? t('games.comingSoon') : t('games.play')}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: tokens.colors.bg },
  scroll: {
    padding: tokens.spacing.lg,
    paddingBottom: tokens.spacing.xxxl,
  },
  header: {
    marginBottom: tokens.spacing.lg,
    gap: tokens.spacing.xs,
  },
  title: {
    fontSize: tokens.fontSize.xxl,
    fontWeight: tokens.fontWeight.extrabold,
    color: tokens.colors.text,
  },
  subtitle: {
    fontSize: tokens.fontSize.base,
    color: tokens.colors.textMuted,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.md,
    justifyContent: 'space-between',
  },
  tile: {
    width: '48%',
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    alignItems: 'center',
    gap: tokens.spacing.xs,
    minHeight: 170,
  },
  tileLocked: {
    backgroundColor: tokens.colors.surfaceAlt,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: tokens.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.xs,
  },
  iconCircleLocked: {
    backgroundColor: tokens.colors.border + '33',
  },
  tileName: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
    textAlign: 'center',
  },
  tileTagline: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    minHeight: 32,
  },
  pill: {
    marginTop: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 4,
    borderRadius: tokens.radius.pill,
  },
  pillActive: {
    backgroundColor: tokens.colors.primary,
  },
  pillLocked: {
    backgroundColor: tokens.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  pillText: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.white,
  },
  pillTextLocked: {
    color: tokens.colors.textMuted,
  },
})
