// DEMO_HOME_LAYOUT — embedded fallback for the layout-driven home screen.
// Locale model: titles carry inline { en, ar } strings for v1 so super-admin
// authoring is faster. Migrate to i18n-key references (e.g. 'home.orderAgain')
// once the super-admin authoring surface ships and centralized translation
// management is required.

import type { HomeLayout } from '@/src/types/homeLayout'

export const DEMO_HOME_LAYOUT: HomeLayout = {
  version: 1,
  publishedAt: '2026-05-20T08:00:00Z',
  defaultLocale: 'en',
  slots: [
    {
      id: 'home.hero.v1',
      type: 'hero_carousel',
      title: null,
      source: { kind: 'mock', key: 'DEMO_SLIDES' },
    },
    {
      id: 'home.categories.v1',
      type: 'category_grid',
      title: null,
      source: { kind: 'mock', key: 'DEMO_CATEGORIES' },
    },
    {
      id: 'home.order_again.v1',
      type: 'order_again_strip',
      title: { en: 'Order again', ar: 'اطلب مرة أخرى' },
      actionLabel: { en: 'See all', ar: 'عرض الكل' },
      actionRoute: '/orders',
      source: { kind: 'derived', key: 'order_again', filter: { limit: 10 } },
      visibleIf: { auth: 'required', nonEmpty: true },
    },
    {
      id: 'home.picks_for_you.v1',
      type: 'picks_for_you_row',
      title: { en: 'Picks for you 🔥', ar: 'مختاراتك 🔥' },
      actionLabel: { en: 'See all', ar: 'عرض الكل' },
      actionRoute: '/(tabs)/shops',
      source: { kind: 'mock', key: 'DEMO_FOR_YOU' },
    },
    {
      id: 'home.active_baskets.v1',
      type: 'active_baskets_strip',
      title: { en: 'Continue shopping', ar: 'متابعة التسوق' },
      source: { kind: 'derived', key: 'active_baskets' },
      visibleIf: { nonEmpty: true },
    },
    {
      id: 'home.featured_shops.v1',
      type: 'featured_shops_row',
      title: { en: 'Featured shops', ar: 'متاجر مميزة' },
      actionLabel: { en: 'See all', ar: 'عرض الكل' },
      actionRoute: '/(tabs)/shops',
      source: { kind: 'mock', key: 'DEMO_SHOPS', filter: { limit: 3 } },
    },
    {
      id: 'home.promoted_shops.may2026.v1',
      type: 'promoted_shops_slot',
      title: { en: 'Trending near you', ar: 'رائج بالقرب منك' },
      source: { kind: 'mock', key: 'DEMO_SHOPS', filter: { limit: 3 } },
      sponsorship: {
        campaignId: 'camp-2026-05-baghdad-burgers',
        advertiserShopSlug: 'hamzas-kitchen',
        startsAt: '2026-05-15T00:00:00Z',
        endsAt: '2026-05-31T23:59:59Z',
      },
    },
    {
      id: 'home.popular_breakfast.v1',
      type: 'category_product_row',
      title: { en: 'Most popular in breakfast', ar: 'الأكثر شعبية في الإفطار' },
      actionLabel: { en: 'See all', ar: 'عرض الكل' },
      actionRoute: '/(tabs)/shops',
      source: {
        kind: 'mock',
        key: 'DEMO_PRODUCTS_BY_SHOP',
        filter: { categoryHandle: 'breakfast', limit: 10 },
      },
    },
    {
      id: 'home.inspired_by_past.v1',
      type: 'inspired_by_past',
      title: { en: 'Inspired by your past orders', ar: 'مستوحى من طلباتك السابقة' },
      source: { kind: 'derived', key: 'inspired_by_past', filter: { limit: 8 } },
      mixRatio: { shops: 1, products: 2 },
      visibleIf: { auth: 'required', nonEmpty: true },
    },
    {
      id: 'home.deals.v1',
      type: 'deals_row',
      title: { en: 'Top deals', ar: 'أفضل العروض' },
      actionLabel: { en: 'See all', ar: 'عرض الكل' },
      actionRoute: '/(tabs)/shops',
      source: { kind: 'mock', key: 'DEMO_DEALS' },
    },
    {
      id: 'home.promo_strip.delivery.v1',
      type: 'promo_strip',
      source: {
        kind: 'static',
        payload: {
          icon: '🚚',
          headline: 'Free delivery over 25,000 IQD',
          subtext: 'Limited time offer for Baghdad',
          bg: 'saffron',
        },
      },
    },
    {
      id: 'home.nearby.v1',
      type: 'nearby_shops_list',
      title: { en: 'Shops near you', ar: 'متاجر قريبة منك' },
      actionLabel: { en: 'See all', ar: 'عرض الكل' },
      actionRoute: '/(tabs)/shops',
      source: { kind: 'mock', key: 'DEMO_SHOPS' },
    },
  ],
}
