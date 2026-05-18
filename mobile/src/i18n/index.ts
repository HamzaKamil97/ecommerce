// Minimal i18n scaffold. EN + AR ready. Add more languages by adding files to ./locales/.
// Picks up the device locale (Expo Localization) — if none match, falls back to EN.

import { en } from './locales/en';
import { ar } from './locales/ar';

export type Locale = 'en' | 'ar';
export type Translations = typeof en;

const DICTS: Record<Locale, Translations> = { en, ar };

let currentLocale: Locale = 'en';

export function setLocale(locale: Locale) {
  if (DICTS[locale]) currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function isRTL(): boolean {
  return currentLocale === 'ar';
}

// t('cart.add') → "Add to cart" or "أضف إلى السلة"
export function t(key: keyof Translations, vars?: Record<string, string | number>): string {
  let s = (DICTS[currentLocale]?.[key] ?? DICTS.en[key] ?? key) as string;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replace(`{${k}}`, String(v));
    }
  }
  return s;
}

// Detect device locale on app start.
export function initLocale(deviceLocale?: string) {
  if (!deviceLocale) return;
  const short = deviceLocale.slice(0, 2).toLowerCase() as Locale;
  if (DICTS[short]) {
    currentLocale = short;
  }
}
