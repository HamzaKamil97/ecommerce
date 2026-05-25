import React from 'react'
import { Stack } from 'expo-router'
import { ComingSoon } from '@/src/components/ComingSoon'
import { t } from '@/src/i18n'
import { useLanguageStore } from '@/src/store/languageStore'

export default function PrepAlongScreen() {
  useLanguageStore((s) => s.locale)
  return (
    <>
      <Stack.Screen options={{ title: t('games.prepAlong.name') }} />
      <ComingSoon
        icon="restaurant"
        title={t('games.prepAlong.name')}
        subtitle={t('games.prepAlong.comingSoon')}
      />
    </>
  )
}
