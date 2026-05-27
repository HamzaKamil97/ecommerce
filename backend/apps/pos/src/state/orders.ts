import { create } from 'zustand';
import {
  listOrders,
  acceptOrder,
  rejectOrder,
  partialAcceptOrder,
  type OnlineOrder,
} from '../api/onlineOrders';

type OrdersState = {
  pending: OnlineOrder[];
  picking: OnlineOrder[];
  done: OnlineOrder[];
  loading: boolean;
  error: string | null;
  fetchAll: (vendor_id: string) => Promise<void>;
  accept: (vendor_id: string, id: string) => Promise<void>;
  reject: (vendor_id: string, id: string) => Promise<void>;
  partial: (vendor_id: string, id: string, oosLineIds: string[]) => Promise<void>;
};

export const useOrders = create<OrdersState>((set, get) => ({
  pending: [],
  picking: [],
  done: [],
  loading: false,
  error: null,

  async fetchAll(vendor_id: string) {
    set({ loading: true, error: null });
    try {
      const [pending, picking, done] = await Promise.all([
        listOrders(vendor_id, 'pending'),
        listOrders(vendor_id, 'picking'),
        listOrders(vendor_id, 'delivered'),
      ]);
      set({ pending, picking, done, loading: false });
    } catch (e: any) {
      set({ loading: false, error: e?.message ?? 'failed to load orders' });
    }
  },

  async accept(vendor_id: string, id: string) {
    await acceptOrder(id);
    await get().fetchAll(vendor_id);
  },

  async reject(vendor_id: string, id: string) {
    await rejectOrder(id);
    await get().fetchAll(vendor_id);
  },

  async partial(vendor_id: string, id: string, oosLineIds: string[]) {
    await partialAcceptOrder(id, oosLineIds);
    await get().fetchAll(vendor_id);
  },
}));
