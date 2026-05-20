import { create } from 'zustand'

export type SortBy = 'distance' | 'rating' | 'deliveryTime' | null

export interface FilterState {
  vertical: string | null
  deliveryUnder: number | null
  minRating: number | null
  sortBy: SortBy
  setVertical: (v: string | null) => void
  setDeliveryUnder: (n: number | null) => void
  setMinRating: (r: number | null) => void
  setSortBy: (s: SortBy) => void
  setAll: (input: {
    vertical: string | null
    deliveryUnder: number | null
    minRating: number | null
    sortBy: SortBy
  }) => void
  clear: () => void
  activeCount: () => number
}

export const useFilterStore = create<FilterState>((set, get) => ({
  vertical: null,
  deliveryUnder: null,
  minRating: null,
  sortBy: null,
  setVertical: (v) => set({ vertical: v }),
  setDeliveryUnder: (n) => set({ deliveryUnder: n }),
  setMinRating: (r) => set({ minRating: r }),
  setSortBy: (s) => set({ sortBy: s }),
  setAll: (input) =>
    set({
      vertical: input.vertical,
      deliveryUnder: input.deliveryUnder,
      minRating: input.minRating,
      sortBy: input.sortBy,
    }),
  clear: () =>
    set({
      vertical: null,
      deliveryUnder: null,
      minRating: null,
      sortBy: null,
    }),
  activeCount: () => {
    const s = get()
    let n = 0
    if (s.vertical) n++
    if (s.deliveryUnder !== null) n++
    if (s.minRating !== null) n++
    if (s.sortBy) n++
    return n
  },
}))
