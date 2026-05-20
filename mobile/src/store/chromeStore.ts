import { create } from 'zustand'

interface ChromeState {
  butlerFabHidden: boolean
  setButlerFabHidden: (b: boolean) => void
}

export const useChromeStore = create<ChromeState>((set) => ({
  butlerFabHidden: false,
  setButlerFabHidden: (b) => set({ butlerFabHidden: b }),
}))
