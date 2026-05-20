import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/src/store/authStore';
// cartStore now uses Zustand persist — no explicit init() needed
import { ONBOARDING_KEY } from './onboarding';
import { FlyToCartHost } from '@/src/components/cart/FlyToCartHost';
import { CrossShopModal } from '@/src/components/cart/CrossShopModal';
import { ToastHost } from '@/src/components/Toast';
import { useLanguageStore } from '@/src/store/languageStore';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const initAuth = useAuthStore((s) => s.init);
  const initLanguage = useLanguageStore((s) => s.init);

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
      </Stack>
      <FlyToCartHost />
      <CrossShopModal />
      <ToastHost />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
