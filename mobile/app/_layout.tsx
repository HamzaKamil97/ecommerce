import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { JetBrainsMono_500Medium, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { NotoSansArabic_500Medium, NotoSansArabic_700Bold } from '@expo-google-fonts/noto-sans-arabic';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/src/store/authStore';
// cartStore now uses Zustand persist — no explicit init() needed
import { ONBOARDING_KEY } from './onboarding';
import { FlyToCartHost } from '@/src/components/cart/FlyToCartHost';
import { CrossShopModal } from '@/src/components/cart/CrossShopModal';
import { ToastHost } from '@/src/components/Toast';
import { useLanguageStore } from '@/src/store/languageStore';
import { t } from '@/src/i18n';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const initAuth = useAuthStore((s) => s.init);
  const initLanguage = useLanguageStore((s) => s.init);

  // Fonts load asynchronously; RN swaps in the custom fonts once ready.
  // We intentionally do not block render — the system font is the fallback.
  useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
    NotoSansArabic_500Medium,
    NotoSansArabic_700Bold,
  });

  useEffect(() => {
    initAuth();
    initLanguage();
    AsyncStorage.getItem(ONBOARDING_KEY).then((v) => {
      if (!v) router.replace('/onboarding');
    });
  }, [initAuth, initLanguage, router]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="products/[id]" options={{ title: 'Product' }} />
        <Stack.Screen name="shops/[slug]" options={{ title: 'Shop' }} />
        <Stack.Screen name="reviews/[productId]" options={{ title: 'Reviews' }} />
        <Stack.Screen name="wallet" options={{ title: 'Wallet' }} />
        <Stack.Screen name="loyalty" options={{ title: 'Rewards' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
        <Stack.Screen name="addresses" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="order/success/[id]" options={{ title: 'Order placed', headerShown: false }} />
        <Stack.Screen name="orders/[id]" options={{ title: 'Order', headerShown: true }} />
        <Stack.Screen name="payment-methods" options={{ title: t('comingSoon.paymentMethods.title') }} />
        <Stack.Screen name="favorites" options={{ title: t('comingSoon.favorites.title') }} />
        <Stack.Screen name="help" options={{ title: t('comingSoon.help.title') }} />
        <Stack.Screen name="terms" options={{ title: t('comingSoon.terms.title') }} />
        <Stack.Screen name="privacy" options={{ title: t('comingSoon.privacy.title') }} />
        <Stack.Screen name="najma/camera" options={{ headerShown: false }} />
        <Stack.Screen name="games" options={{ title: t('games.hubTitle'), headerShown: true }} />
        <Stack.Screen name="games/souk-wheel" options={{ title: t('games.soukWheel.name'), headerShown: true }} />
        <Stack.Screen name="games/recipe" options={{ title: t('games.recipe.name'), headerShown: true }} />
        <Stack.Screen name="games/chefs-race" options={{ title: t('games.chefsRace.name'), headerShown: true }} />
        <Stack.Screen name="games/guess-price" options={{ title: t('games.guessPrice.name'), headerShown: true }} />
        <Stack.Screen name="games/predict-arrival" options={{ title: t('games.predictArrival.name'), headerShown: true }} />
        <Stack.Screen name="games/souk-stories" options={{ title: t('games.soukStories.name'), headerShown: true }} />
        <Stack.Screen name="games/voice-memo" options={{ title: t('games.voiceMemo.name'), headerShown: true }} />
        <Stack.Screen name="games/prep-along" options={{ title: t('games.prepAlong.name'), headerShown: true }} />
        <Stack.Screen name="games/playlist" options={{ title: t('games.playlist.name'), headerShown: true }} />
        <Stack.Screen name="group-gift" options={{ title: t('locked.groupGift.title'), headerShown: true }} />
        <Stack.Screen name="wedding-registry" options={{ title: t('locked.weddingRegistry.title'), headerShown: true }} />
        <Stack.Screen name="refer" options={{ title: t('locked.refer.title'), headerShown: true }} />
        <Stack.Screen name="gift-occasions" options={{ title: t('locked.giftOccasions.title'), headerShown: true }} />
        <Stack.Screen name="family" options={{ title: t('locked.family.title'), headerShown: true }} />
        <Stack.Screen name="seasonal" options={{ title: t('locked.seasonal.title'), headerShown: true }} />
        <Stack.Screen name="special" options={{ title: t('locked.special.title'), headerShown: true }} />
        <Stack.Screen name="concierge" options={{ title: t('locked.concierge.title'), headerShown: true }} />
      </Stack>
      <FlyToCartHost />
      <CrossShopModal />
      <ToastHost />
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}
