import React, { useMemo, useState } from 'react'
import { SafeAreaView, ScrollView, View, Text, Image, Pressable, StyleSheet } from 'react-native'
import { useRouter, Stack } from 'expo-router'
import { tokens } from '@/src/theme/tokens'
import { t } from '@/src/i18n'
import { useLanguageStore } from '@/src/store/languageStore'
import { useChromeStore } from '@/src/store/chromeStore'
import { RECIPES } from '@/src/data/waitGamesRecipes'

function hashDate(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export default function RecipeScreen() {
  useLanguageStore((s) => s.locale)
  const router = useRouter()

  // Hide the Najma FAB during the game.
  React.useEffect(() => {
    useChromeStore.getState().setNajmaFabHidden(true)
    return () => useChromeStore.getState().setNajmaFabHidden(false)
  }, [])

  const startIndex = useMemo(
    () => hashDate(new Date().toDateString()) % RECIPES.length,
    [],
  )
  const [index, setIndex] = useState(startIndex)
  const recipe = RECIPES[index]
  const dateLabel = useMemo(
    () => new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    [],
  )

  return (
    <SafeAreaView style={styles.root}>
      <Stack.Screen options={{ title: t('games.recipe.name') }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Image source={{ uri: recipe.image }} style={styles.image} />

        <View style={styles.body}>
          <Text style={styles.name}>{t(recipe.nameKey)}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>{t(recipe.regionKey)}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.meta}>
              {t('games.recipe.prepMin', { min: recipe.prepMinutes })}
            </Text>
          </View>

          <Text style={styles.section}>{t('games.recipe.ingredients')}</Text>
          <View style={styles.list}>
            {recipe.ingredients.map((line, i) => (
              <View key={i} style={styles.bulletRow}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>{line}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.section}>{t('games.recipe.steps')}</Text>
          <View style={styles.list}>
            {recipe.steps.map((line, i) => (
              <View key={i} style={styles.stepRow}>
                <Text style={styles.stepNum}>{i + 1}</Text>
                <Text style={styles.stepText}>{line}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.byline}>
            {t('games.recipe.bylineFmt', { date: dateLabel })}
          </Text>

          <View style={styles.actionRow}>
            <Pressable
              onPress={() => setIndex((i) => (i + 1) % RECIPES.length)}
              style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.btnPrimaryText}>{t('games.recipe.cookAnother')}</Text>
            </Pressable>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.btn, styles.btnSecondary, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.btnSecondaryText}>{t('games.soukWheel.back')}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: tokens.colors.bg },
  scroll: { paddingBottom: tokens.spacing.xxxl },
  image: { width: '100%', height: 220, backgroundColor: tokens.colors.surfaceAlt },
  body: { padding: tokens.spacing.lg, gap: tokens.spacing.sm },
  name: {
    fontSize: tokens.fontSize.xxl,
    fontWeight: tokens.fontWeight.extrabold,
    color: tokens.colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    marginBottom: tokens.spacing.md,
  },
  meta: { fontSize: tokens.fontSize.base, color: tokens.colors.textMuted },
  metaDot: { color: tokens.colors.textMuted },
  section: {
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
    marginTop: tokens.spacing.md,
    marginBottom: tokens.spacing.xs,
  },
  list: { gap: tokens.spacing.sm },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: tokens.colors.primary },
  bulletText: {
    flex: 1,
    fontSize: tokens.fontSize.base,
    color: tokens.colors.textSubtle,
    lineHeight: 22,
  },
  stepRow: { flexDirection: 'row', gap: tokens.spacing.md, alignItems: 'flex-start' },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: tokens.colors.primary,
    color: tokens.colors.white,
    fontWeight: tokens.fontWeight.bold,
    textAlign: 'center',
    lineHeight: 26,
    fontSize: tokens.fontSize.sm,
  },
  stepText: {
    flex: 1,
    fontSize: tokens.fontSize.base,
    color: tokens.colors.textSubtle,
    lineHeight: 22,
  },
  byline: {
    marginTop: tokens.spacing.lg,
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  actionRow: { flexDirection: 'row', gap: tokens.spacing.sm, marginTop: tokens.spacing.lg },
  btn: { flex: 1, height: 48, borderRadius: tokens.radius.pill, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: tokens.colors.primary },
  btnPrimaryText: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.white,
  },
  btnSecondary: { borderWidth: 1.5, borderColor: tokens.colors.primary },
  btnSecondaryText: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.primary,
  },
})
