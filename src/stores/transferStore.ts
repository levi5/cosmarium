import { create } from 'zustand'
import type { TransferProgress } from '../types/explorer'

export const TRANSFER_NOTICE_TIMEOUT = 5000

export type TransferItem = TransferProgress & {
  queued: boolean
  paused: boolean
  speed: number
  updatedAt: number
  startedAt: number
  completedAt?: number
  cancelled?: boolean
}

type TransferState = {
  items: Record<string, TransferItem>
  dismissedIds: string[]
  panelOpen: boolean
  setPanelOpen: (open: boolean) => void
  enqueue: (id: string, cut: boolean) => void
  receive: (progress: TransferProgress) => void
  finish: (id: string, error: string | null, cancelled?: boolean) => void
  pause: (id: string, paused: boolean) => void
  dismiss: (id: string) => void
}

export const useTransferStore = create<TransferState>((set) => ({
  items: {},
  dismissedIds: [],
  panelOpen: false,
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  enqueue: (id, cut) =>
    set((state) => ({
      panelOpen: true,
      dismissedIds: state.dismissedIds.filter((dismissed) => dismissed !== id),
      items: {
        ...state.items,
        [id]: {
          id,
          cut,
          kind: cut ? 'move' : 'copy',
          done_files: 0,
          total_files: 0,
          done_bytes: 0,
          total_bytes: 0,
          finished: false,
          error: null,
          queued: true,
          paused: false,
          speed: 0,
          startedAt: Date.now(),
          updatedAt: Date.now()
        }
      }
    })),
  receive: (progress) =>
    set((state) => {
      if (state.dismissedIds.includes(progress.id)) return state
      const previous = state.items[progress.id]
      const now = Date.now()
      const elapsed = previous ? (now - previous.updatedAt) / 1000 : 0
      const speed = previous && !previous.paused && !previous.queued && elapsed > 0 ? Math.max(0, progress.done_bytes - previous.done_bytes) / elapsed : 0
      return {
        panelOpen: !previous || (progress.error && !previous.error) ? true : state.panelOpen,
        items: {
          ...state.items,
          [progress.id]: {
            ...progress,
            finished: progress.finished || previous?.finished || false,
            error: progress.error ?? (previous?.finished ? previous.error : null),
            cancelled: progress.cancelled || previous?.cancelled,
            queued: false,
            paused: previous?.paused ?? false,
            speed,
            startedAt: previous?.startedAt ?? now,
            completedAt: previous?.completedAt ?? (progress.finished ? now : undefined),
            updatedAt: now
          }
        }
      }
    }),
  finish: (id, error, cancelled) =>
    set((state) => {
      const item = state.items[id]
      return item
        ? {
            panelOpen: error ? true : state.panelOpen,
            items: { ...state.items, [id]: { ...item, finished: true, queued: false, error, cancelled, completedAt: item.completedAt ?? Date.now() } }
          }
        : state
    }),
  pause: (id, paused) =>
    set((state) => {
      const item = state.items[id]
      return item ? { items: { ...state.items, [id]: { ...item, paused, speed: 0, updatedAt: Date.now() } } } : state
    }),
  dismiss: (id) =>
    set((state) => {
      const items = { ...state.items }
      delete items[id]
      return { items, dismissedIds: [...state.dismissedIds.filter((dismissed) => dismissed !== id), id].slice(-200) }
    })
}))
