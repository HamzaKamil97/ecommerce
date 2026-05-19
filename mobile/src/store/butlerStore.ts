import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type ButlerRequestKind =
  | 'find_cheaper'
  | 'item_not_listed'
  | 'compare_shops'
  | 'bundle_deal'
  | 'free_text'

export interface ButlerRequest {
  id: string
  kind: ButlerRequestKind
  text?: string
  createdAt: number
}

interface ButlerState {
  requests: ButlerRequest[]
  addRequest: (input: { kind: ButlerRequestKind; text?: string }) => void
  clear: () => void
}

export const useButlerStore = create<ButlerState>()(
  persist(
    (set) => ({
      requests: [],
      addRequest: ({ kind, text }) =>
        set((s) => ({
          requests: [
            { id: `br-${Date.now()}`, kind, text, createdAt: Date.now() },
            ...s.requests,
          ].slice(0, 50),
        })),
      clear: () => set({ requests: [] }),
    }),
    {
      name: 'hanoot-butler',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)
