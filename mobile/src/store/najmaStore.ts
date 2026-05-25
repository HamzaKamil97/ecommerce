import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type NajmaRequestKind =
  | 'find_cheaper'
  | 'item_not_listed'
  | 'compare_shops'
  | 'bundle_deal'
  | 'free_text'

export interface NajmaRequest {
  id: string
  kind: NajmaRequestKind
  text?: string
  createdAt: number
}

interface NajmaState {
  requests: NajmaRequest[]
  addRequest: (input: { kind: NajmaRequestKind; text?: string }) => void
  clear: () => void
}

export const useNajmaStore = create<NajmaState>()(
  persist(
    (set) => ({
      requests: [],
      addRequest: ({ kind, text }) =>
        set((s) => ({
          requests: [
            { id: `nr-${Date.now()}`, kind, text, createdAt: Date.now() },
            ...s.requests,
          ].slice(0, 50),
        })),
      clear: () => set({ requests: [] }),
    }),
    {
      name: 'hanoot-najma',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)
