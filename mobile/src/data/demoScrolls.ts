// `videoUrl` will be vendor-uploaded once the vendor mobile portal ships.
// Until then, entries without a videoUrl fall back to imageUrl rendering
// in ScrollCard. The single demo entry below with a public mp4 is intentional.

export interface ScrollItem {
  id: string
  shopSlug: string
  shopName: string
  shopLogoUrl: string
  vertical: string
  productId: string
  productName: string
  price: number
  currency: 'iqd' | 'usd'
  imageUrl: string
  videoUrl?: string
  caption: string
  likes: string
}

export const DEMO_SCROLLS: ScrollItem[] = [
  {
    id: 'scroll-1',
    shopSlug: 'hamzas-kitchen',
    shopName: "Hamza's Kitchen",
    shopLogoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200',
    vertical: 'Food',
    productId: 'hk-margherita-pizza',
    productName: 'Margherita Pizza',
    price: 15000,
    currency: 'iqd',
    imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1080',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    caption: 'Wood-fired in 90 seconds. Crust so good it became a religion.',
    likes: '12.4k',
  },
  {
    id: 'scroll-2',
    shopSlug: 'style-hub',
    shopName: 'Style Hub',
    shopLogoUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200',
    vertical: 'Fashion',
    productId: 'sh-jeans',
    productName: 'Slim Fit Jeans',
    price: 35000,
    currency: 'iqd',
    imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=1080',
    caption: 'The denim everyone in Baghdad is asking about this week.',
    likes: '8.1k',
  },
  {
    id: 'scroll-3',
    shopSlug: 'freshmart',
    shopName: 'FreshMart',
    shopLogoUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200',
    vertical: 'Grocery',
    productId: 'fm-fresh-milk',
    productName: 'Fresh Milk 1L',
    price: 3500,
    currency: 'iqd',
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=1080',
    caption: 'Bottled at sunrise. On your doorstep before lunch.',
    likes: '2.6k',
  },
  {
    id: 'scroll-4',
    shopSlug: 'techpoint',
    shopName: 'TechPoint',
    shopLogoUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200',
    vertical: 'Electronics',
    productId: 'tp-wireless-earbuds',
    productName: 'Pro Wireless Earbuds',
    price: 45000,
    currency: 'iqd',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1080',
    caption: '28 hours of silence. Or 28 hours of your favourite song.',
    likes: '15.9k',
  },
  {
    id: 'scroll-5',
    shopSlug: 'bayti',
    shopName: 'Bayti',
    shopLogoUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200',
    vertical: 'Home',
    productId: 'by-kettle',
    productName: 'Electric Kettle 1.7L',
    price: 25000,
    currency: 'iqd',
    imageUrl: 'https://images.unsplash.com/photo-1544781887-d2cac94dfad6?w=1080',
    caption: 'Boil-water-in-90-seconds energy. Tea will never wait again.',
    likes: '843',
  },
  {
    id: 'scroll-6',
    shopSlug: 'hamzas-kitchen',
    shopName: "Hamza's Kitchen",
    shopLogoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200',
    vertical: 'Food',
    productId: 'hk-bbq-burger',
    productName: 'BBQ Smash Burger',
    price: 12000,
    currency: 'iqd',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1080',
    caption: 'Smashed thin, glazed in house BBQ, double-stacked on demand.',
    likes: '6.2k',
  },
]
