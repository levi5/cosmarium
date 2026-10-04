import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { STORAGE } from '../constants/storage'

export type RecentItem = {
  path: string
  name: string
  kind: 'file' | 'directory'
  usedAt: number
}

const MAX_RECENT_ITEMS = 100

type RecentState = {
  items: RecentItem[]
  clearedAt: number | null
  record: (entry: Omit<RecentItem, 'usedAt'>) => void
  clear: () => void
}

export const useRecentStore = create<RecentState>()(
  persist(
    (set) => ({
      items: [],
      clearedAt: null,
      record: (entry) =>
        set((state) => {
          const now = Math.floor(Date.now() / 1000)
          const rest = state.items.filter((item) => item.path !== entry.path)
          return { items: [{ ...entry, usedAt: now }, ...rest].slice(0, MAX_RECENT_ITEMS) }
        }),
      clear: () => set({ items: [], clearedAt: Math.floor(Date.now() / 1000) })
    }),
    { name: STORAGE.recentList, partialize: (state) => ({ items: state.items, clearedAt: state.clearedAt }) }
  )
)
