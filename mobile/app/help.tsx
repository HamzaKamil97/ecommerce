import React from 'react'
import { ComingSoon } from '@/src/components/ComingSoon'
import { t } from '@/src/i18n'
import { useLanguageStore } from '@/src/store/languageStore'

export default function HelpScreen() {
  useLanguageStore((s) => s.locale)
  return (
    <ComingSoon
      icon="chatbubble-ellipses"
      title={t('comingSoon.help.title')}
      subtitle={t('comingSoon.help.subtitle')}
    />
  )
}
