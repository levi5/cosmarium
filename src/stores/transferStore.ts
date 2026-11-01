import { create } from 'zustand'
import type { TransferProgress } from '../types/explorer'

export type TransferItem = TransferProgress & { queued: boolean; paused: boolean; speed: number; updatedAt: number; cancelled?: boolean }

type TransferState = {
  items: Record<string, TransferItem>
  enqueue: (id: string, cut: boolean) => void
  receive: (progress: TransferProgress) => void
  finish: (id: string, error: string | null, cancelled?: boolean) => void
  pause: (id: string, paused: boolean) => void
  dismiss: (id: string) => void
}

export const useTransferStore = create<TransferState>((set) => ({
  items: {},
  enqueue: (id, cut) =>
    set((state) => ({
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
          updatedAt: Date.now()
        }
      }
    })),
  receive: (progress) =>
    set((state) => {
      const previous = state.items[progress.id]
      const now = Date.now()
      const elapsed = previous ? (now - previous.updatedAt) / 1000 : 0
      const speed = previous && !previous.paused && !previous.queued && elapsed > 0 ? Math.max(0, progress.done_bytes - previous.done_bytes) / elapsed : 0
      return {
        items: {
          ...state.items,
          [progress.id]: {
            ...progress,
            finished: progress.finished || previous?.finished || false,
            error: progress.error ?? (previous?.finished ? previous.error : null),
            cancelled: previous?.cancelled,
            queued: false,
            paused: previous?.paused ?? false,
            speed,
            updatedAt: now
          }
        }
      }
    }),
  finish: (id, error, cancelled) =>
    set((state) => {
      const item = state.items[id]
      return item ? { items: { ...state.items, [id]: { ...item, finished: true, queued: false, error, cancelled } } } : state
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
      return { items }
    })
}))
