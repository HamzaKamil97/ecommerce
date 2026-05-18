import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as cartApi from '../api/cart';

const CART_ID_KEY = 'medusa.cart.id';

interface CartState {
  cartId: string | null;
  cart: any | null;
  isLoading: boolean;
  init: () => Promise<void>;
  ensureCart: () => Promise<string>;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  updateItem: (lineId: string, quantity: number) => Promise<void>;
  removeItem: (lineId: string) => Promise<void>;
  refresh: () => Promise<void>;
  clear: () => Promise<void>;
}

export const useCartStore = create<CartState>((set, get) => ({
  cartId: null,
  cart: null,
  isLoading: false,

  init: async () => {
    const storedId = await AsyncStorage.getItem(CART_ID_KEY);
    if (storedId) {
      try {
        const cart = await cartApi.getCart(storedId);
        set({ cartId: storedId, cart });
      } catch {
        await AsyncStorage.removeItem(CART_ID_KEY);
      }
    }
  },

  ensureCart: async () => {
    const existing = get().cartId;
    if (existing) return existing;
    const cart = await cartApi.createCart();
    await AsyncStorage.setItem(CART_ID_KEY, cart.id);
    set({ cartId: cart.id, cart });
    return cart.id;
  },

  addItem: async (variantId, quantity = 1) => {
    set({ isLoading: true });
    const cartId = await get().ensureCart();
    const cart = await cartApi.addLineItem(cartId, variantId, quantity);
    set({ cart, isLoading: false });
  },

  updateItem: async (lineId, quantity) => {
    const cartId = get().cartId;
    if (!cartId) return;
    set({ isLoading: true });
    const cart = await cartApi.updateLineItem(cartId, lineId, quantity);
    set({ cart, isLoading: false });
  },

  removeItem: async (lineId) => {
    const cartId = get().cartId;
    if (!cartId) return;
    set({ isLoading: true });
    const cart = await cartApi.removeLineItem(cartId, lineId);
    set({ cart, isLoading: false });
  },

  refresh: async () => {
    const cartId = get().cartId;
    if (!cartId) return;
    const cart = await cartApi.getCart(cartId);
    set({ cart });
  },

  clear: async () => {
    await AsyncStorage.removeItem(CART_ID_KEY);
    set({ cartId: null, cart: null });
  },
}));
