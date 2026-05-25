import { create } from 'zustand';

export type CartLine = {
  variant_id: string;
  name: string;
  unit_price_minor: number;
  qty: number;
};

type CartState = {
  lines: CartLine[];
  addLineFromScan: (line: CartLine) => void;
  setQty: (variant_id: string, qty: number) => void;
  removeLine: (variant_id: string) => void;
  subtotalMinor: () => number;
  reset: () => void;
};

export const useCart = create<CartState>((set, get) => ({
  lines: [],
  addLineFromScan(line) {
    set((s) => {
      const existing = s.lines.find((l) => l.variant_id === line.variant_id);
      if (existing) {
        return {
          lines: s.lines.map((l) =>
            l.variant_id === line.variant_id ? { ...l, qty: l.qty + line.qty } : l
          ),
        };
      }
      return { lines: [...s.lines, { ...line }] };
    });
  },
  setQty(variant_id, qty) {
    set((s) => ({
      lines: qty <= 0
        ? s.lines.filter((l) => l.variant_id !== variant_id)
        : s.lines.map((l) => (l.variant_id === variant_id ? { ...l, qty } : l)),
    }));
  },
  removeLine(variant_id) {
    set((s) => ({ lines: s.lines.filter((l) => l.variant_id !== variant_id) }));
  },
  subtotalMinor() {
    let total = 0;
    for (const l of get().lines) total += l.qty * l.unit_price_minor;
    return total;
  },
  reset() { set({ lines: [] }); },
}));
