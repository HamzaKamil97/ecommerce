import { create } from 'zustand';

export type CartItem = {
  variant_id: string;
  title: string;
  unit_price_minor: number;
  qty: number;
  weigh_at_counter: boolean;
};

type CartState = {
  items: CartItem[];
  subtotal_minor: number;
  item_count: number;
  locked: boolean;
  short_code: string | null;
  /** remote cart id once created via POST /pos/scan-carts */
  cart_id: string | null;
};

type CartActions = {
  addItem(item: Omit<CartItem, 'qty'> & { qty?: number }): void;
  incQty(variant_id: string): void;
  decQty(variant_id: string): void;
  removeItem(variant_id: string): void;
  lock(short_code: string): void;
  setCartId(cart_id: string): void;
  clear(): void;
};

// ---------------------------------------------------------------------------
// Pure derivation helpers
// ---------------------------------------------------------------------------

function computeSubtotal(items: CartItem[]): number {
  return items.reduce(
    (sum, item) => (item.weigh_at_counter ? sum : sum + item.unit_price_minor * item.qty),
    0,
  );
}

function computeItemCount(items: CartItem[]): number {
  // item_count = number of distinct lines (not sum of qty), matching test expectation
  return items.length;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useCart = create<CartState & CartActions>((set, get) => ({
  items: [],
  subtotal_minor: 0,
  item_count: 0,
  locked: false,
  short_code: null,
  cart_id: null,

  addItem(incoming) {
    if (get().locked) throw new Error('Cart is locked — cannot add items after sending');
    const qty = incoming.qty ?? 1;
    const { items } = get();
    const existing = items.find((i) => i.variant_id === incoming.variant_id);
    let next: CartItem[];
    if (existing) {
      next = items.map((i) =>
        i.variant_id === incoming.variant_id ? { ...i, qty: i.qty + qty } : i,
      );
    } else {
      next = [...items, { ...incoming, qty }];
    }
    set({
      items: next,
      subtotal_minor: computeSubtotal(next),
      item_count: computeItemCount(next),
    });
  },

  incQty(variant_id) {
    const { items } = get();
    const next = items.map((i) =>
      i.variant_id === variant_id ? { ...i, qty: i.qty + 1 } : i,
    );
    set({ items: next, subtotal_minor: computeSubtotal(next), item_count: computeItemCount(next) });
  },

  decQty(variant_id) {
    const { items } = get();
    const next = items
      .map((i) => (i.variant_id === variant_id ? { ...i, qty: i.qty - 1 } : i))
      .filter((i) => i.qty > 0);
    set({ items: next, subtotal_minor: computeSubtotal(next), item_count: computeItemCount(next) });
  },

  removeItem(variant_id) {
    const next = get().items.filter((i) => i.variant_id !== variant_id);
    set({ items: next, subtotal_minor: computeSubtotal(next), item_count: computeItemCount(next) });
  },

  lock(short_code) {
    set({ locked: true, short_code });
  },

  setCartId(cart_id) {
    set({ cart_id });
  },

  clear() {
    set({
      items: [],
      subtotal_minor: 0,
      item_count: 0,
      locked: false,
      short_code: null,
      cart_id: null,
    });
  },
}));
