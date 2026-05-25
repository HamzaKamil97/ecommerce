import { create } from 'zustand'

interface ChromeState {
  najmaFabHidden: boolean
  setNajmaFabHidden: (b: boolean) => void
}

export const useChromeStore = create<ChromeState>((set) => ({
  najmaFabHidden: false,
  setNajmaFabHidden: (b) => set({ najmaFabHidden: b }),
}))
