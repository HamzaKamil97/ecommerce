import React from 'react'
import { ComingSoon } from '@/src/components/ComingSoon'
import { t } from '@/src/i18n'
import { useLanguageStore } from '@/src/store/languageStore'
import { useChromeStore } from '@/src/store/chromeStore'

export default function ConciergeScreen() {
  useLanguageStore((s) => s.locale)
  React.useEffect(() => {
    useChromeStore.getState().setNajmaFabHidden(true)
    return () => useChromeStore.getState().setNajmaFabHidden(false)
  }, [])
  return (
    <ComingSoon
      icon="chatbubbles"
      title={t('locked.concierge.title')}
      subtitle={t('locked.concierge.subtitle')}
    />
  )
}
