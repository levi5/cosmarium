import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ViewMode } from '../constants/view'
import { newOperationId } from '../lib/id'
import type { SortDirection, SortKey } from '../types/explorer'

export type WorkspaceSnapshot = {
  paths: string[]
  activeIndex: number
  view: ViewMode
  sortKey: SortKey
  sortDirection: SortDirection
  query: string
  detailsPane: boolean
  split: boolean
  secondaryPath: string
  showHidden: boolean
}
export type SavedWorkspace = { id: string; name: string; snapshot: WorkspaceSnapshot }
export type VirtualFolder = { id: string; name: string; root: string; query: string }

type ProductivityState = {
  rehearsal: boolean
  workspaces: SavedWorkspace[]
  folders: VirtualFolder[]
  setRehearsal: (enabled: boolean) => void
  saveWorkspace: (name: string, snapshot: WorkspaceSnapshot) => void
  removeWorkspace: (id: string) => void
  saveFolder: (name: string, root: string, query: string) => void
  removeFolder: (id: string) => void
}

export const useProductivityStore = create<ProductivityState>()(
  persist(
    (set) => ({
      rehearsal: false,
      workspaces: [],
      folders: [],
      setRehearsal: (rehearsal) => set({ rehearsal }),
      saveWorkspace: (name, snapshot) => {
        if (!name.trim() || !snapshot.paths.length) return
        const item = { id: newOperationId(), name: name.trim(), snapshot: structuredClone(snapshot) }
        set((state) => ({ workspaces: [...state.workspaces, item].slice(-50) }))
      },
      removeWorkspace: (id) => set((state) => ({ workspaces: state.workspaces.filter((item) => item.id !== id) })),
      saveFolder: (name, root, query) => {
        if (!name.trim() || !root.trim() || !query.trim()) return
        const item = { id: newOperationId(), name: name.trim(), root: root.trim(), query: query.trim() }
        set((state) => ({ folders: [...state.folders, item].slice(-50) }))
      },
      removeFolder: (id) => set((state) => ({ folders: state.folders.filter((item) => item.id !== id) }))
    }),
    { name: 'cosmarium-productivity' }
  )
)
