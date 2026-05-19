// Demo data for home screen components.
// Source of truth: backend/apps/backend/src/scripts/seed-demo-shops.ts
// Real data (list-all-shops endpoint) deferred to SP-B.

export interface HeroSlide {
  id: string
  title: string
  subtitle: string
  ctaLabel: string
  imageUrl: string
}

export interface DemoCategory {
  handle: string
  label: string
  iconUrl: string
}

export interface DemoShop {
  slug: string
  name: string
  coverUrl: string
  logoUrl: string
  rating: number
  ratingCount: number
  vertical: string
  deliveryMinutes: number
  minOrder: string
  isOpen: boolean
}

export interface DemoBasket {
  id: string
  shopSlug: string
  shopName: string
  shopLogoUrl: string
  itemCount: number
  totalFormatted: string
}

export const DEMO_SLIDES: HeroSlide[] = [
  {
    id: 'slide-1',
    title: '20% off your first order',
    subtitle: 'Welcome to Hanoot — Baghdad\'s super-app',
    ctaLabel: 'Shop now',
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
  },
  {
    id: 'slide-2',
    title: 'Free delivery',
    subtitle: 'On all orders over 25,000 IQD this week',
    ctaLabel: 'Order now',
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800',
  },
  {
    id: 'slide-3',
    title: 'Shop electronics',
    subtitle: 'Latest gadgets delivered same day',
    ctaLabel: 'Browse',
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800',
  },
]

export const DEMO_CATEGORIES: DemoCategory[] = [
  {
    handle: 'food',
    label: 'Food',
    iconUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200',
  },
  {
    handle: 'grocery',
    label: 'Grocery',
    iconUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200',
  },
  {
    handle: 'fashion',
    label: 'Fashion',
    iconUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200',
  },
  {
    handle: 'electronics',
    label: 'Electronics',
    iconUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200',
  },
  {
    handle: 'home',
    label: 'Home',
    iconUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200',
  },
]

export const DEMO_SHOPS: DemoShop[] = [
  {
    slug: 'hamzas-kitchen',
    name: "Hamza's Kitchen",
    coverUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600',
    logoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200',
    rating: 4.8,
    ratingCount: 320,
    vertical: 'Food',
    deliveryMinutes: 25,
    minOrder: '5,000 IQD',
    isOpen: true,
  },
  {
    slug: 'freshmart',
    name: 'FreshMart',
    coverUrl: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600',
    logoUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200',
    rating: 4.6,
    ratingCount: 215,
    vertical: 'Grocery',
    deliveryMinutes: 30,
    minOrder: '10,000 IQD',
    isOpen: true,
  },
  {
    slug: 'style-hub',
    name: 'Style Hub',
    coverUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600',
    logoUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200',
    rating: 4.5,
    ratingCount: 180,
    vertical: 'Fashion',
    deliveryMinutes: 45,
    minOrder: '$10',
    isOpen: true,
  },
  {
    slug: 'techpoint',
    name: 'TechPoint',
    coverUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600',
    logoUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200',
    rating: 4.7,
    ratingCount: 142,
    vertical: 'Electronics',
    deliveryMinutes: 60,
    minOrder: '$15',
    isOpen: false,
  },
  {
    slug: 'bayti',
    name: 'Bayti',
    coverUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600',
    logoUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200',
    rating: 4.4,
    ratingCount: 98,
    vertical: 'Home',
    deliveryMinutes: 50,
    minOrder: '15,000 IQD',
    isOpen: true,
  },
]

// ── Shop detail data ────────────────────────────────────────────────────────
// Hardcoded until SP-F adds real shop signals (ratings, delivery, cover images).

export const HERO_COVERS: Record<string, string> = {
  'hamzas-kitchen': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
  'freshmart': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800',
  'style-hub': 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
  'techpoint': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800',
  'bayti': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800',
}

export interface ShopDetailMeta {
  rating: number
  ratingCount: number
  deliveryMinutes: string
  minOrder: string
  deliveryFee: string
  isOpen: boolean
}

export const SHOP_META: Record<string, ShopDetailMeta> = {
  'hamzas-kitchen': { rating: 4.8, ratingCount: 312, deliveryMinutes: '25–35', minOrder: '5,000 IQD', deliveryFee: 'Free', isOpen: true },
  'freshmart': { rating: 4.6, ratingCount: 204, deliveryMinutes: '20–30', minOrder: '10,000 IQD', deliveryFee: 'Free', isOpen: true },
  'style-hub': { rating: 4.7, ratingCount: 88, deliveryMinutes: '45–60', minOrder: '$15', deliveryFee: '$2', isOpen: true },
  'techpoint': { rating: 4.9, ratingCount: 156, deliveryMinutes: '60–90', minOrder: '$20', deliveryFee: '$3', isOpen: true },
  'bayti': { rating: 4.5, ratingCount: 67, deliveryMinutes: '30–45', minOrder: '15,000 IQD', deliveryFee: 'Free', isOpen: true },
}

// ── Demo merch categories per shop (for offline / static-preview rendering) ──
import type { MerchCategory } from '@/src/lib/api/types'

function mk(handle: string, name: string, position: number): MerchCategory {
  return { id: `demo-${handle}`, handle, name, position, icon_url: null }
}

export const DEMO_MERCH_BY_SHOP: Record<string, MerchCategory[]> = {
  'hamzas-kitchen': [
    mk('pizzas', 'Pizzas', 1),
    mk('burgers', 'Burgers', 2),
    mk('salads', 'Salads', 3),
    mk('pasta', 'Pasta', 4),
    mk('desserts', 'Desserts', 5),
    mk('drinks', 'Drinks', 6),
  ],
  'freshmart': [
    mk('pantry', 'Pantry', 1),
    mk('dairy', 'Dairy', 2),
    mk('fresh', 'Fresh', 3),
    mk('bakery', 'Bakery', 4),
    mk('snacks', 'Snacks', 5),
  ],
  'style-hub': [
    mk('mens', 'Mens', 1),
    mk('womens', 'Womens', 2),
    mk('shoes', 'Shoes', 3),
    mk('accessories', 'Accessories', 4),
  ],
  'techpoint': [
    mk('audio', 'Audio', 1),
    mk('charging', 'Charging', 2),
    mk('wearables', 'Wearables', 3),
  ],
  'bayti': [
    mk('kitchen', 'Kitchen', 1),
    mk('bedroom', 'Bedroom', 2),
    mk('bathroom', 'Bathroom', 3),
    mk('decor', 'Decor', 4),
    mk('cleaning', 'Cleaning', 5),
  ],
}

// ── Mock active baskets — real state comes in SP-B ───────────────────────────
export const DEMO_ACTIVE_BASKETS: DemoBasket[] = [
  {
    id: 'basket-1',
    shopSlug: 'hamzas-kitchen',
    shopName: "Hamza's Kitchen",
    shopLogoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200',
    itemCount: 2,
    totalFormatted: '27,000 IQD',
  },
]
