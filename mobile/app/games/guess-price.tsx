import React from 'react'
import { Stack } from 'expo-router'
import { ComingSoon } from '@/src/components/ComingSoon'
import { t } from '@/src/i18n'
import { useLanguageStore } from '@/src/store/languageStore'

export default function GuessPriceScreen() {
  useLanguageStore((s) => s.locale)
  return (
    <>
      <Stack.Screen options={{ title: t('games.guessPrice.name') }} />
      <ComingSoon
        icon="pricetag"
        title={t('games.guessPrice.name')}
        subtitle={t('games.guessPrice.comingSoon')}
      />
    </>
  )
}
