import React from 'react'
import { ComingSoon } from '@/src/components/ComingSoon'
import { t } from '@/src/i18n'
import { useLanguageStore } from '@/src/store/languageStore'

export default function FavoritesScreen() {
  useLanguageStore((s) => s.locale)
  return (
    <ComingSoon
      icon="heart"
      title={t('comingSoon.favorites.title')}
      subtitle={t('comingSoon.favorites.subtitle')}
    />
  )
}
