export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'

export interface DemoOrderItem {
  name: string
  qty: number
  price: string
  imageUrl?: string
}

export interface DemoOrderCourier {
  name: string
  phone: string
}

export interface DemoOrderAddress {
  label: string
  line: string
}

export interface DemoOrder {
  id: string
  displayId: string
  shopSlug: string
  shopName: string
  shopLogoUrl: string
  vertical: string
  items: DemoOrderItem[]
  total: string
  currency: 'IQD'
  prep_time_min: number
  status: OrderStatus
  eta?: string
  placed_at: string
  confirmed_at?: string
  prepared_at?: string
  picked_up_at?: string
  delivered_at?: string
  courier?: DemoOrderCourier | null
  address: DemoOrderAddress
}

const minAgo = (m: number) => new Date(Date.now() - m * 60 * 1000).toISOString()
const hAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString()

export const DEMO_ORDERS: DemoOrder[] = [
  {
    id: 'ord_001',
    displayId: 'A7K9P2',
    shopSlug: 'sahara-supermarket',
    shopName: 'Sahara Supermarket',
    shopLogoUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200',
    vertical: 'Grocery',
    items: [
      { name: 'Fresh Milk 1L', qty: 2, price: '7,000 IQD', imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200' },
      { name: 'Free Range Eggs ×12', qty: 1, price: '5,000 IQD', imageUrl: 'https://images.unsplash.com/photo-1559598484-d83a4c2f7c27?w=200' },
      { name: 'Sourdough Loaf', qty: 1, price: '4,500 IQD', imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200' },
      { name: 'Greek Yogurt 500g', qty: 1, price: '2,000 IQD', imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=200' },
    ],
    total: '18,500 IQD',
    currency: 'IQD',
    prep_time_min: 20,
    status: 'preparing',
    eta: '25–35 min',
    placed_at: minAgo(12),
    confirmed_at: minAgo(8),
    courier: null,
    address: { label: 'Home', line: 'Karrada, Baghdad' },
  },
  {
    id: 'ord_002',
    displayId: 'B3M5N8',
    shopSlug: 'baghdad-bakery',
    shopName: 'Baghdad Bakery',
    shopLogoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200',
    vertical: 'Food',
    items: [
      { name: 'Margherita Pizza', qty: 1, price: '6,200 IQD', imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200' },
      { name: 'Tiramisu', qty: 1, price: '2,000 IQD', imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=200' },
    ],
    total: '8,200 IQD',
    currency: 'IQD',
    prep_time_min: 15,
    status: 'out_for_delivery',
    eta: '5–10 min',
    placed_at: minAgo(28),
    confirmed_at: minAgo(25),
    prepared_at: minAgo(10),
    picked_up_at: minAgo(1),
    courier: { name: 'Ali', phone: '+964 770 555 0123' },
    address: { label: 'Home', line: 'Karrada, Baghdad' },
  },
  {
    id: 'ord_003',
    displayId: 'C9X4Q1',
    shopSlug: 'tech-souq',
    shopName: 'Tech Souq',
    shopLogoUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200',
    vertical: 'Electronics',
    items: [
      { name: 'Pro Wireless Earbuds', qty: 1, price: '125,000 IQD', imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200' },
    ],
    total: '125,000 IQD',
    currency: 'IQD',
    prep_time_min: 30,
    status: 'delivered',
    placed_at: hAgo(26),
    confirmed_at: hAgo(26),
    prepared_at: hAgo(25.5),
    picked_up_at: hAgo(25.2),
    delivered_at: hAgo(25),
    courier: { name: 'Hassan', phone: '+964 770 555 0456' },
    address: { label: 'Home', line: 'Karrada, Baghdad' },
  },
]

export function findDemoOrder(id?: string | null): DemoOrder | undefined {
  if (!id) return undefined
  return DEMO_ORDERS.find((o) => o.id === id || o.displayId === id)
}
