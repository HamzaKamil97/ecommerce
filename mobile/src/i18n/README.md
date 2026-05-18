# i18n — translations

Tiny scaffold. EN + AR keys ready. Add a new language by:

1. Copy `locales/en.ts` to `locales/<code>.ts`
2. Translate values (keep keys identical to `en.ts`)
3. Add to `index.ts`:
   ```ts
   import { fr } from './locales/fr'
   const DICTS = { en, ar, fr }
   ```

## Use in components

```tsx
import { t } from '@/src/i18n'

<Text>{t('cart.total')}</Text>
<Text>{t('shop.productsFrom', { name: shop.name })}</Text>
```

## Set locale

Currently not wired into the app yet — by default everything renders English. To activate Arabic when the device is set to Arabic:

```tsx
// In app/_layout.tsx, after auth init:
import * as Localization from 'expo-localization'
import { initLocale } from '@/src/i18n'

initLocale(Localization.getLocales()[0]?.languageCode ?? 'en')
```

Requires `npx expo install expo-localization`.

## RTL

```tsx
import { isRTL } from '@/src/i18n'
import { I18nManager } from 'react-native'

I18nManager.forceRTL(isRTL())  // call once at app boot, then reload
```

This flips all flex directions. Tested with Arabic.

## Server-side i18n

The Medusa backend stores product/category data in one language at a time. For multi-language product names, store translations in `metadata`:

```json
{ "title_translations": { "en": "Roses", "ar": "ورود" } }
```

…then resolve client-side based on user locale.
