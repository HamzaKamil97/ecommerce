import { Tabs } from 'expo-router';
import React from 'react';
import { View, StyleSheet } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ButlerFab } from '@/src/components/butler/ButlerFab';
import { t } from '@/src/i18n';
import { useLanguageStore } from '@/src/store/languageStore';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  useLanguageStore((s) => s.locale);

  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: false,
          tabBarButton: HapticTab,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: t('tab.shop'),
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="shops"
          options={{
            title: t('tab.shops'),
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="storefront.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="scrolls"
          options={{
            title: t('tab.scrolls'),
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="play.rectangle.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="cart"
          options={{
            title: t('tab.cart'),
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="cart.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: t('tab.orders'),
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="bag.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t('tab.profile'),
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
          }}
        />
      </Tabs>
      <ButlerFab />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
