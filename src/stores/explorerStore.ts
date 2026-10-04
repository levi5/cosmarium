import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ExplorerTab } from '../types/explorer'

type ExplorerState = {
  tabs: ExplorerTab[]
  activeTabId: string | null
  closedTabs: ExplorerTab[]
  initialize: (home: string) => void
  createTab: (path: string) => void
  duplicateTab: (id: string) => void
  closeTab: (id: string) => void
  restoreClosedTab: () => void
  reorderTabs: (from: number, to: number) => void
  setActiveTab: (id: string) => void
  navigate: (path: string) => void
  goBack: () => void
  goForward: () => void
}

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const titleFor = (path: string) => path.split(/[\\/]/).filter(Boolean).pop() || 'Home'
const createTab = (path: string): ExplorerTab => ({ id: createId(), title: titleFor(path), path, history: [path], historyIndex: 0 })

export const useExplorerStore = create<ExplorerState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,
      closedTabs: [],
      initialize: (home) => {
        if (get().tabs.length > 0 && get().activeTabId) return
        const tab = createTab(home)
        set({ tabs: [tab], activeTabId: tab.id })
      },
      createTab: (path) => {
        const tab = createTab(path)
        set((state) => ({ tabs: [...state.tabs, tab], activeTabId: tab.id }))
      },
      duplicateTab: (id) => {
        const tab = get().tabs.find((item) => item.id === id)
        if (!tab) return
        get().createTab(tab.path)
      },
      closeTab: (id) =>
        set((state) => {
          if (state.tabs.length <= 1) return {}
          const closingIndex = state.tabs.findIndex((tab) => tab.id === id)
          const closing = state.tabs[closingIndex]
          if (!closing) return {}
          const tabs = state.tabs.filter((tab) => tab.id !== id)
          const nextIndex = Math.min(closingIndex, tabs.length - 1)
          return {
            tabs,
            activeTabId: state.activeTabId === id ? tabs[nextIndex].id : state.activeTabId,
            closedTabs: [closing, ...state.closedTabs].slice(0, 10)
          }
        }),
      restoreClosedTab: () =>
        set((state) => {
          const [tab, ...closedTabs] = state.closedTabs
          return tab ? { tabs: [...state.tabs, tab], activeTabId: tab.id, closedTabs } : state
        }),
      reorderTabs: (from, to) =>
        set((state) => {
          if (from === to || from < 0 || to < 0 || from >= state.tabs.length || to >= state.tabs.length) return state
          const tabs = [...state.tabs]
          const [tab] = tabs.splice(from, 1)
          tabs.splice(to, 0, tab)
          return { tabs }
        }),
      setActiveTab: (id) => set({ activeTabId: id }),
      navigate: (path) =>
        set((state) => ({
          tabs: state.tabs.map((tab) => {
            if (tab.id !== state.activeTabId || tab.path === path) return tab
            const history = [...tab.history.slice(0, tab.historyIndex + 1), path]
            return { ...tab, path, title: titleFor(path), history, historyIndex: history.length - 1 }
          })
        })),
      goBack: () =>
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === state.activeTabId && tab.historyIndex > 0
              ? { ...tab, historyIndex: tab.historyIndex - 1, path: tab.history[tab.historyIndex - 1], title: titleFor(tab.history[tab.historyIndex - 1]) }
              : tab
          )
        })),
      goForward: () =>
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === state.activeTabId && tab.historyIndex < tab.history.length - 1
              ? { ...tab, historyIndex: tab.historyIndex + 1, path: tab.history[tab.historyIndex + 1], title: titleFor(tab.history[tab.historyIndex + 1]) }
              : tab
          )
        }))
    }),
    { name: 'cosmarium-explorer-tabs', partialize: (state) => ({ tabs: state.tabs, activeTabId: state.activeTabId, closedTabs: state.closedTabs }) }
  )
)
