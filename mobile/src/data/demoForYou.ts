export interface ForYouRecommendation {
  id: string
  productId: string
  productName: string
  shopSlug: string
  shopName: string
  shopLogoUrl: string
  vertical: string
  price: number
  currency: 'iqd' | 'usd'
  imageUrl: string
  reason:
    | { kind: 'because_ordered'; arg: string }
    | { kind: 'trending'; arg: string }
}

export const DEMO_FOR_YOU: ForYouRecommendation[] = [
  {
    id: 'fy-1',
    productId: 'hk-bbq-burger',
    productName: 'BBQ Smash Burger',
    shopSlug: 'hamzas-kitchen',
    shopName: "Hamza's Kitchen",
    shopLogoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200',
    vertical: 'Food',
    price: 12000,
    currency: 'iqd',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600',
    reason: { kind: 'because_ordered', arg: "Hamza's Kitchen" },
  },
  {
    id: 'fy-2',
    productId: 'tp-wireless-earbuds',
    productName: 'Pro Wireless Earbuds',
    shopSlug: 'techpoint',
    shopName: 'TechPoint',
    shopLogoUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200',
    vertical: 'Electronics',
    price: 45000,
    currency: 'iqd',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',
    reason: { kind: 'trending', arg: 'Electronics' },
  },
  {
    id: 'fy-3',
    productId: 'fm-yogurt',
    productName: 'Greek Yogurt 500g',
    shopSlug: 'freshmart',
    shopName: 'FreshMart',
    shopLogoUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200',
    vertical: 'Grocery',
    price: 4000,
    currency: 'iqd',
    imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600',
    reason: { kind: 'because_ordered', arg: 'FreshMart' },
  },
  {
    id: 'fy-4',
    productId: 'sh-tshirt',
    productName: 'Classic White Tee',
    shopSlug: 'style-hub',
    shopName: 'Style Hub',
    shopLogoUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200',
    vertical: 'Fashion',
    price: 15000,
    currency: 'iqd',
    imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600',
    reason: { kind: 'trending', arg: 'Fashion' },
  },
  {
    id: 'fy-5',
    productId: 'by-cushion',
    productName: 'Linen Throw Cushion',
    shopSlug: 'bayti',
    shopName: 'Bayti',
    shopLogoUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200',
    vertical: 'Home',
    price: 12000,
    currency: 'iqd',
    imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600',
    reason: { kind: 'trending', arg: 'Home' },
  },
  {
    id: 'fy-6',
    productId: 'hk-tiramisu',
    productName: 'Tiramisu',
    shopSlug: 'hamzas-kitchen',
    shopName: "Hamza's Kitchen",
    shopLogoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200',
    vertical: 'Food',
    price: 6000,
    currency: 'iqd',
    imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600',
    reason: { kind: 'because_ordered', arg: "Hamza's Kitchen" },
  },
]
