import React from 'react'
import { ComingSoon } from '@/src/components/ComingSoon'
import { t } from '@/src/i18n'
import { useLanguageStore } from '@/src/store/languageStore'

export default function PaymentMethodsScreen() {
  useLanguageStore((s) => s.locale)
  return (
    <ComingSoon
      icon="card"
      title={t('comingSoon.paymentMethods.title')}
      subtitle={t('comingSoon.paymentMethods.subtitle')}
    />
  )
}
