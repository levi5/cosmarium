import { create } from 'zustand'

export type ClipboardMode = 'copy' | 'cut'

type ClipboardState = {
  mode: ClipboardMode | null
  paths: string[]
  setClipboard: (mode: ClipboardMode, paths: string[]) => void
  clear: () => void
}

export const useClipboardStore = create<ClipboardState>()((set) => ({
  mode: null,
  paths: [],
  setClipboard: (mode, paths) => set({ mode, paths }),
  clear: () => set({ mode: null, paths: [] })
}))
