import { Tabs } from 'expo-router';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { NajmaFab } from '@/src/components/najma/NajmaFab';
import { t } from '@/src/i18n';
import { useLanguageStore } from '@/src/store/languageStore';
import { useCartStore } from '@/src/store/cartStore';
import { tokens } from '@/src/theme/tokens';

export default function TabLayout() {
  useLanguageStore((s) => s.locale);
  const cartCount = useCartStore((s) => s.itemCount());

  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarActiveTintColor: tokens.colors.primary,
          tabBarInactiveTintColor: tokens.colors.textMuted,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabBarLabel,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: t('tab.home'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={26} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="shops"
          options={{
            title: t('tab.browse'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'compass' : 'compass-outline'} size={26} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="scrolls"
          options={{
            title: t('tab.scrolls'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'play-circle' : 'play-circle-outline'} size={26} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="cart"
          options={{
            title: t('tab.cart'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'cart' : 'cart-outline'} size={26} color={color} />
            ),
            tabBarBadge: cartCount > 0 ? cartCount : undefined,
            tabBarBadgeStyle: styles.cartBadge,
          }}
        />
        <Tabs.Screen
          name="orders"
          // TODO(SP-D4): wire active-orders count for tabBarBadge from /store/orders
          options={{
            title: t('tab.orders'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={26} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t('tab.me'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={26} color={color} />
            ),
          }}
        />
      </Tabs>
      <NajmaFab />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: tokens.colors.bg,
    borderTopColor: tokens.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: 64,
    paddingTop: 6,
    paddingBottom: 6,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: tokens.fontWeight.semibold,
    marginTop: 2,
  },
  cartBadge: {
    backgroundColor: tokens.colors.accent,
    color: tokens.colors.text,
    fontSize: 10,
    minWidth: 18,
    height: 18,
  },
});
