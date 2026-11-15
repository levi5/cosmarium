import { beforeEach, expect, it } from 'vitest'
import { useExplorerStore } from './explorerStore'

beforeEach(() => {
  useExplorerStore.setState({
    tabs: [],
    activeTabId: null,
    closedTabs: [],
    initialize: useExplorerStore.getState().initialize,
    startAt: useExplorerStore.getState().startAt,
    createTab: useExplorerStore.getState().createTab,
    duplicateTab: useExplorerStore.getState().duplicateTab,
    closeTab: useExplorerStore.getState().closeTab,
    restoreClosedTab: useExplorerStore.getState().restoreClosedTab,
    reorderTabs: useExplorerStore.getState().reorderTabs,
    setActiveTab: useExplorerStore.getState().setActiveTab,
    navigate: useExplorerStore.getState().navigate,
    goBack: useExplorerStore.getState().goBack,
    goForward: useExplorerStore.getState().goForward
  })
})

it('initializes a single home tab on startup', () => {
  useExplorerStore.getState().initialize('/home/levi')
  const state = useExplorerStore.getState()
  expect(state.tabs).toHaveLength(1)
  expect(state.activeTabId).toBe(state.tabs[0].id)
})

it('resets to a single tab when starting at a path', () => {
  useExplorerStore.getState().initialize('/home/levi')
  useExplorerStore.getState().closeTab(useExplorerStore.getState().tabs[0].id)
  useExplorerStore.getState().startAt('/home/levi/projects')
  const state = useExplorerStore.getState()
  expect(state.tabs).toHaveLength(1)
  expect(state.tabs[0].path).toBe('/home/levi/projects')
  expect(state.closedTabs).toHaveLength(0)
})
