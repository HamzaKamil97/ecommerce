import React from 'react'
import { Stack } from 'expo-router'
import { ComingSoon } from '@/src/components/ComingSoon'
import { t } from '@/src/i18n'
import { useLanguageStore } from '@/src/store/languageStore'

export default function SoukStoriesScreen() {
  useLanguageStore((s) => s.locale)
  return (
    <>
      <Stack.Screen options={{ title: t('games.soukStories.name') }} />
      <ComingSoon
        icon="book"
        title={t('games.soukStories.name')}
        subtitle={t('games.soukStories.comingSoon')}
      />
    </>
  )
}
