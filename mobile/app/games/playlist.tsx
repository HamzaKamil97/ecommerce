import React from 'react'
import { Stack } from 'expo-router'
import { ComingSoon } from '@/src/components/ComingSoon'
import { t } from '@/src/i18n'
import { useLanguageStore } from '@/src/store/languageStore'

export default function PlaylistScreen() {
  useLanguageStore((s) => s.locale)
  return (
    <>
      <Stack.Screen options={{ title: t('games.playlist.name') }} />
      <ComingSoon
        icon="musical-notes"
        title={t('games.playlist.name')}
        subtitle={t('games.playlist.comingSoon')}
      />
    </>
  )
}
