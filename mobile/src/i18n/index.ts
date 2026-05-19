// Minimal i18n scaffold. EN + AR ready. Add more languages by adding files to ./locales/.
// Picks up persisted user preference first, then device locale (Expo Localization) — if none match, falls back to EN.

import { I18nManager } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { en } from './locales/en'
import { ar } from './locales/ar'

export type Locale = 'en' | 'ar'
export type Translations = typeof en

export const LANG_STORAGE_KEY = 'hanoot-lang'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DICTS: Record<Locale, Translations> = { en, ar: ar as any }

let currentLocale: Locale = 'en'

// Allow RTL once at module load so the flag is always set before rendering.
I18nManager.allowRTL(true)

export function setLocale(locale: Locale) {
  if (DICTS[locale]) currentLocale = locale
}

export function getLocale(): Locale {
  return currentLocale
}

export function isRTL(): boolean {
  return currentLocale === 'ar'
}

// t('cart.add') → "Add to cart" or "أضف إلى السلة"
export function t(key: keyof Translations, vars?: Record<string, string | number>): string {
  let s = (DICTS[currentLocale]?.[key] ?? DICTS.en[key] ?? key) as string
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replace(`{${k}}`, String(v))
    }
  }
  return s
}

// Detect device locale on app start.
export function initLocale(deviceLocale?: string) {
  if (!deviceLocale) return
  const short = deviceLocale.slice(0, 2).toLowerCase() as Locale
  if (DICTS[short]) {
    currentLocale = short
  }
}

// Persist + apply language change. Caller must reload app or remount tree.
export async function setLanguage(code: Locale): Promise<void> {
  setLocale(code)
  I18nManager.forceRTL(code === 'ar')
  await AsyncStorage.setItem(LANG_STORAGE_KEY, code)
}

// Read persisted language from AsyncStorage and apply it synchronously.
// Call this BEFORE the first render (inside _layout.tsx useEffect).
export async function initPersistedLocale(): Promise<Locale> {
  try {
    const stored = await AsyncStorage.getItem(LANG_STORAGE_KEY)
    if (stored === 'ar' || stored === 'en') {
      setLocale(stored)
      I18nManager.forceRTL(stored === 'ar')
      return stored
    }
  } catch {
    // ignore — fall back to default
  }
  return currentLocale
}
