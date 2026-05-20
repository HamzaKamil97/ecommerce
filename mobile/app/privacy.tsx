import React from 'react'
import { ComingSoon } from '@/src/components/ComingSoon'
import { t } from '@/src/i18n'
import { useLanguageStore } from '@/src/store/languageStore'

export default function PrivacyScreen() {
  useLanguageStore((s) => s.locale)
  return (
    <ComingSoon
      icon="shield-checkmark"
      title={t('comingSoon.privacy.title')}
      subtitle={t('comingSoon.privacy.subtitle')}
    />
  )
}
