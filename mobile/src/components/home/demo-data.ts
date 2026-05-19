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

// Mock active baskets — real state comes in SP-B
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
