import React from 'react'
import { Stack } from 'expo-router'
import { ComingSoon } from '@/src/components/ComingSoon'
import { t } from '@/src/i18n'
import { useLanguageStore } from '@/src/store/languageStore'

export default function ChefsRaceScreen() {
  useLanguageStore((s) => s.locale)
  return (
    <>
      <Stack.Screen options={{ title: t('games.chefsRace.name') }} />
      <ComingSoon
        icon="flame"
        title={t('games.chefsRace.name')}
        subtitle={t('games.chefsRace.comingSoon')}
      />
    </>
  )
}
