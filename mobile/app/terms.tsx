import React from 'react'
import { ComingSoon } from '@/src/components/ComingSoon'
import { t } from '@/src/i18n'
import { useLanguageStore } from '@/src/store/languageStore'

export default function TermsScreen() {
  useLanguageStore((s) => s.locale)
  return (
    <ComingSoon
      icon="document-text"
      title={t('comingSoon.terms.title')}
      subtitle={t('comingSoon.terms.subtitle')}
    />
  )
}
