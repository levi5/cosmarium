import { create } from 'zustand'

type SelectionState = {
  selected: string[]
  setSelected: (paths: string[]) => void
}

export const useSelectionStore = create<SelectionState>()((set) => ({
  selected: [],
  setSelected: (paths) => set({ selected: paths })
}))
