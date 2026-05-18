export interface CartLineItem {
  id: string;
  variant_id: string;
  product_id: string;
  title: string;
  thumbnail?: string | null;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Cart {
  id: string;
  items: CartLineItem[];
  subtotal: number;
  total: number;
  currency_code: string;
}
