import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { NajmaChatError } from '@/src/lib/najma/openai'

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

export interface NajmaChatEntry {
  role: 'user' | 'assistant'
  content: string
}

export type NajmaChatStatus = 'idle' | 'thinking' | 'error'

interface NajmaState {
  requests: NajmaRequest[]
  addRequest: (input: { kind: NajmaRequestKind; text?: string }) => void
  clear: () => void

  // ── A-Re5: real chat state ──────────────────────────────────────────────
  chatMessages: NajmaChatEntry[]
  chatStatus: NajmaChatStatus
  chatError: NajmaChatError | null
  addUserMessage: (content: string) => void
  addAssistantMessage: (content: string) => void
  clearChat: () => void
  setStatus: (s: NajmaChatStatus) => void
  setError: (e: NajmaChatError | null) => void
}

const CHAT_CAP = 50

function cap(list: NajmaChatEntry[]): NajmaChatEntry[] {
  return list.length > CHAT_CAP ? list.slice(list.length - CHAT_CAP) : list
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

      chatMessages: [],
      chatStatus: 'idle',
      chatError: null,
      addUserMessage: (content) =>
        set((s) => ({
          chatMessages: cap([...s.chatMessages, { role: 'user', content }]),
        })),
      addAssistantMessage: (content) =>
        set((s) => ({
          chatMessages: cap([...s.chatMessages, { role: 'assistant', content }]),
        })),
      clearChat: () => set({ chatMessages: [], chatStatus: 'idle', chatError: null }),
      setStatus: (chatStatus) => set({ chatStatus }),
      setError: (chatError) => set({ chatError }),
    }),
    {
      name: 'hanoot-najma',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)
