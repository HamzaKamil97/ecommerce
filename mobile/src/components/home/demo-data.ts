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

// ── Demo products ─────────────────────────────────────────────────────────────
export interface DemoProduct {
  id: string
  title: string
  description: string
  images: string[]
  price_minor: number
  currency: 'iqd' | 'usd'
  shopSlug: string
  shopName: string
  shopLogoUrl: string
}

export const DEMO_PRODUCTS: Record<string, DemoProduct> = {
  'hk-margherita-pizza': {
    id: 'demo-prod-margherita',
    title: 'Margherita Pizza',
    description: 'Wood-fired pizza with fresh basil, mozzarella, and San Marzano tomatoes. Cooked at 450°C in 90 seconds.',
    images: [
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
      'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800',
      'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=800',
    ],
    price_minor: 15000,
    currency: 'iqd',
    shopSlug: 'hamzas-kitchen',
    shopName: "Hamza's Kitchen",
    shopLogoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200',
  },
  'hk-bbq-burger': {
    id: 'demo-prod-bbq-burger',
    title: 'BBQ Smash Burger',
    description: 'Two thin-smashed beef patties, melted cheddar, crispy onions and house BBQ glaze on a brioche bun.',
    images: [
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
    ],
    price_minor: 12000,
    currency: 'iqd',
    shopSlug: 'hamzas-kitchen',
    shopName: "Hamza's Kitchen",
    shopLogoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200',
  },
  'hk-caesar-salad': {
    id: 'demo-prod-caesar',
    title: 'Caesar Salad',
    description: 'Crisp romaine, shaved parmesan, garlic croutons and creamy anchovy dressing.',
    images: [
      'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800',
    ],
    price_minor: 8000,
    currency: 'iqd',
    shopSlug: 'hamzas-kitchen',
    shopName: "Hamza's Kitchen",
    shopLogoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200',
  },
  'hk-carbonara': {
    id: 'demo-prod-carbonara',
    title: 'Spaghetti Carbonara',
    description: 'Hand-rolled spaghetti tossed in a silky egg-yolk sauce with pancetta and aged pecorino.',
    images: [
      'https://images.unsplash.com/photo-1627286394628-253e6ddb0aae?w=800',
    ],
    price_minor: 14000,
    currency: 'iqd',
    shopSlug: 'hamzas-kitchen',
    shopName: "Hamza's Kitchen",
    shopLogoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200',
  },
  'hk-tiramisu': {
    id: 'demo-prod-tiramisu',
    title: 'Tiramisu',
    description: 'Layered espresso-soaked ladyfingers with mascarpone cream and a dusting of cocoa.',
    images: [
      'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800',
    ],
    price_minor: 6000,
    currency: 'iqd',
    shopSlug: 'hamzas-kitchen',
    shopName: "Hamza's Kitchen",
    shopLogoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200',
  },
  'hk-cola': {
    id: 'demo-prod-cola',
    title: 'Coca-Cola 500ml',
    description: 'Ice-cold Coca-Cola in a 500ml bottle.',
    images: [
      'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=800',
    ],
    price_minor: 1500,
    currency: 'iqd',
    shopSlug: 'hamzas-kitchen',
    shopName: "Hamza's Kitchen",
    shopLogoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200',
  },
  'fm-fresh-milk': {
    id: 'demo-prod-milk',
    title: 'Fresh Full-Fat Milk 1L',
    description: 'Locally sourced full-fat cow milk, pasteurised and bottled same-day for maximum freshness.',
    images: [
      'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800',
      'https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?w=800',
    ],
    price_minor: 3500,
    currency: 'iqd',
    shopSlug: 'freshmart',
    shopName: 'FreshMart',
    shopLogoUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200',
  },
  'fm-eggs-12': {
    id: 'demo-prod-eggs',
    title: 'Free Range Eggs ×12',
    description: 'A dozen free-range eggs from pasture-raised hens. Grade A, packed today.',
    images: [
      'https://images.unsplash.com/photo-1559598484-d83a4c2f7c27?w=800',
    ],
    price_minor: 5000,
    currency: 'iqd',
    shopSlug: 'freshmart',
    shopName: 'FreshMart',
    shopLogoUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200',
  },
  'fm-bread': {
    id: 'demo-prod-bread',
    title: 'Sourdough Loaf',
    description: 'Hand-shaped sourdough with a crackling crust and open crumb, baked this morning.',
    images: [
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800',
    ],
    price_minor: 4500,
    currency: 'iqd',
    shopSlug: 'freshmart',
    shopName: 'FreshMart',
    shopLogoUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200',
  },
  'fm-yogurt': {
    id: 'demo-prod-yogurt',
    title: 'Greek Yogurt 500g',
    description: 'Thick strained Greek yogurt, high in protein with a smooth tangy finish.',
    images: [
      'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800',
    ],
    price_minor: 4000,
    currency: 'iqd',
    shopSlug: 'freshmart',
    shopName: 'FreshMart',
    shopLogoUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200',
  },
  'sh-tshirt': {
    id: 'demo-prod-tshirt',
    title: 'Classic White Tee',
    description: '100% combed cotton crew-neck tee. Tailored fit, pre-shrunk, built to last.',
    images: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800',
    ],
    price_minor: 15000,
    currency: 'iqd',
    shopSlug: 'style-hub',
    shopName: 'Style Hub',
    shopLogoUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200',
  },
  'sh-jeans': {
    id: 'demo-prod-jeans',
    title: 'Slim Fit Jeans',
    description: 'Mid-rise slim fit jeans in dark indigo wash with a slight stretch for all-day comfort.',
    images: [
      'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800',
    ],
    price_minor: 35000,
    currency: 'iqd',
    shopSlug: 'style-hub',
    shopName: 'Style Hub',
    shopLogoUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200',
  },
  'tp-wireless-earbuds': {
    id: 'demo-prod-earbuds',
    title: 'Pro Wireless Earbuds',
    description: 'Active noise cancellation, 28-hour battery life, and IPX5 water resistance. Perfect for commutes.',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
      'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800',
    ],
    price_minor: 45000,
    currency: 'iqd',
    shopSlug: 'techpoint',
    shopName: 'TechPoint',
    shopLogoUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200',
  },
  'tp-charger': {
    id: 'demo-prod-charger',
    title: '65W USB-C Charger',
    description: '65W GaN fast charger with a single USB-C port. Powers laptops, phones, and tablets.',
    images: [
      'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800',
    ],
    price_minor: 18000,
    currency: 'iqd',
    shopSlug: 'techpoint',
    shopName: 'TechPoint',
    shopLogoUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200',
  },
  'by-kettle': {
    id: 'demo-prod-kettle',
    title: 'Electric Kettle 1.7L',
    description: '1.7L stainless-steel electric kettle. Boils in 90 seconds with auto-shutoff and dry-boil protection.',
    images: [
      'https://images.unsplash.com/photo-1544781887-d2cac94dfad6?w=800',
    ],
    price_minor: 25000,
    currency: 'iqd',
    shopSlug: 'bayti',
    shopName: 'Bayti',
    shopLogoUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200',
  },
  'by-cushion': {
    id: 'demo-prod-cushion',
    title: 'Linen Throw Cushion',
    description: 'Soft natural-linen throw cushion with a hidden zip. Perfect for sofas and beds.',
    images: [
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800',
    ],
    price_minor: 12000,
    currency: 'iqd',
    shopSlug: 'bayti',
    shopName: 'Bayti',
    shopLogoUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200',
  },
}

// ── Demo products grouped by shop (used in shop screen when backend is down) ──
export interface DemoProductCard {
  id: string
  title: string
  thumbnail: string
  price_minor: number
  currency: 'iqd' | 'usd'
}

export const DEMO_PRODUCTS_BY_SHOP: Record<string, DemoProductCard[]> = {
  'hamzas-kitchen': [
    { id: 'hk-margherita-pizza', title: 'Margherita Pizza', thumbnail: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400', price_minor: 15000, currency: 'iqd' },
    { id: 'hk-bbq-burger', title: 'BBQ Smash Burger', thumbnail: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400', price_minor: 12000, currency: 'iqd' },
    { id: 'hk-caesar-salad', title: 'Caesar Salad', thumbnail: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400', price_minor: 8000, currency: 'iqd' },
    { id: 'hk-carbonara', title: 'Spaghetti Carbonara', thumbnail: 'https://images.unsplash.com/photo-1627286394628-253e6ddb0aae?w=400', price_minor: 14000, currency: 'iqd' },
    { id: 'hk-tiramisu', title: 'Tiramisu', thumbnail: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400', price_minor: 6000, currency: 'iqd' },
    { id: 'hk-cola', title: 'Coca-Cola 500ml', thumbnail: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=400', price_minor: 1500, currency: 'iqd' },
  ],
  'freshmart': [
    { id: 'fm-fresh-milk', title: 'Fresh Milk 1L', thumbnail: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400', price_minor: 3500, currency: 'iqd' },
    { id: 'fm-eggs-12', title: 'Free Range Eggs ×12', thumbnail: 'https://images.unsplash.com/photo-1559598484-d83a4c2f7c27?w=400', price_minor: 5000, currency: 'iqd' },
    { id: 'fm-bread', title: 'Sourdough Loaf', thumbnail: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400', price_minor: 4500, currency: 'iqd' },
    { id: 'fm-yogurt', title: 'Greek Yogurt 500g', thumbnail: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400', price_minor: 4000, currency: 'iqd' },
  ],
  'style-hub': [
    { id: 'sh-tshirt', title: 'Classic White Tee', thumbnail: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', price_minor: 15000, currency: 'iqd' },
    { id: 'sh-jeans', title: 'Slim Fit Jeans', thumbnail: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400', price_minor: 35000, currency: 'iqd' },
  ],
  'techpoint': [
    { id: 'tp-wireless-earbuds', title: 'Pro Wireless Earbuds', thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', price_minor: 45000, currency: 'iqd' },
    { id: 'tp-charger', title: '65W USB-C Charger', thumbnail: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400', price_minor: 18000, currency: 'iqd' },
  ],
  'bayti': [
    { id: 'by-kettle', title: 'Electric Kettle 1.7L', thumbnail: 'https://images.unsplash.com/photo-1544781887-d2cac94dfad6?w=400', price_minor: 25000, currency: 'iqd' },
    { id: 'by-cushion', title: 'Linen Throw Cushion', thumbnail: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400', price_minor: 12000, currency: 'iqd' },
  ],
}

// ── Top deals (image-card carousel — same visual pattern as featured shops) ──
// Admin (later) can swap these. Replaces the earlier solid-color boxes which
// felt empty.
export interface DemoDeal {
  id: string
  title: string
  subtitle: string
  imageUrl: string
  badge: string
}

export const DEMO_DEALS: DemoDeal[] = [
  {
    id: 'deal-margherita',
    title: 'Buy 1 Get 1 Pizza',
    subtitle: "Hamza's Kitchen — today only",
    imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600',
    badge: 'BOGO',
  },
  {
    id: 'deal-electronics',
    title: 'Tech Week',
    subtitle: 'Up to 40% off headphones, watches & more',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',
    badge: '40% off',
  },
  {
    id: 'deal-grocery',
    title: 'Fresh & Free',
    subtitle: 'Free delivery on grocery over 25,000 IQD',
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600',
    badge: 'FREE',
  },
  {
    id: 'deal-fashion',
    title: 'First Order Bonus',
    subtitle: '20% off your first 3 orders',
    imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600',
    badge: '20% off',
  },
]

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
