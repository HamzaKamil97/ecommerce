import type { Locale } from './index'
import type { LocalizedString } from '@/src/types/homeLayout'

export function localized(
  s: LocalizedString | null | undefined,
  locale: Locale,
): string {
  if (!s) return ''
  return s[locale] ?? s.en ?? ''
}
