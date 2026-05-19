/**
 * Language store — thin Zustand slice that holds the active locale code.
 * Components subscribe to `useLanguageStore` and re-render when it changes.
 * The actual i18n state lives in src/i18n/index.ts; this store is the reactive
 * bridge that triggers React re-renders on language switch.
 */
import { create } from 'zustand'
import { setLanguage, getLocale, initPersistedLocale, type Locale } from '@/src/i18n'

interface LanguageState {
  locale: Locale
  isReady: boolean
  /** Switch language, persist, and update store. */
  switchLanguage: (code: Locale) => Promise<void>
  /** Boot: read AsyncStorage, sync store. */
  init: () => Promise<void>
}

export const useLanguageStore = create<LanguageState>((set) => ({
  locale: getLocale(),
  isReady: false,

  init: async () => {
    const locale = await initPersistedLocale()
    set({ locale, isReady: true })
  },

  switchLanguage: async (code: Locale) => {
    await setLanguage(code)
    set({ locale: code })
  },
}))
