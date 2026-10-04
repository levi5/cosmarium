import { create } from 'zustand'

export type PendingDrop = {
  paths: string[]
  dest: string
  cut: boolean
}

type PendingDropState = {
  drop: PendingDrop | null
  token: number
  request: (drop: PendingDrop) => void
  clear: () => void
}

export const usePendingDropStore = create<PendingDropState>()((set) => ({
  drop: null,
  token: 0,
  request: (drop) => set((state) => ({ drop, token: state.token + 1 })),
  clear: () => set({ drop: null })
}))
