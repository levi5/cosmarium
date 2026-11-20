import { beforeEach, expect, it } from 'vitest'
import { useExplorerStore } from './explorerStore'
import { useProductivityStore, type WorkspaceSnapshot } from './productivityStore'

const snapshot = (): WorkspaceSnapshot => ({
  paths: ['/docs', '/photos'],
  activeIndex: 1,
  view: 'grid',
  sortKey: 'size',
  sortDirection: 'desc',
  query: 'ext:png',
  detailsPane: true,
  split: true,
  secondaryPath: '/backup',
  showHidden: true
})

beforeEach(() => {
  localStorage.clear()
  useProductivityStore.setState({ rehearsal: false, workspaces: [], folders: [] })
})

it('saves independent named snapshots and persists them locally', () => {
  const original = snapshot()
  useProductivityStore.getState().saveWorkspace(' Project ', original)
  original.paths[0] = '/changed'
  const [saved] = useProductivityStore.getState().workspaces
  expect(saved.name).toBe('Project')
  expect(saved.snapshot.paths).toEqual(['/docs', '/photos'])
  const persisted = JSON.parse(localStorage.getItem('cosmarium-productivity') ?? '{}')
  expect(persisted.state.workspaces[0]).toEqual(saved)
  useProductivityStore.getState().removeWorkspace(saved.id)
  expect(useProductivityStore.getState().workspaces).toEqual([])
})

it('restores tab order and active tab using fresh navigation histories', () => {
  useExplorerStore.getState().startAt('/old')
  useExplorerStore.getState().restoreWorkspace(snapshot().paths, 1)
  const state = useExplorerStore.getState()
  expect(state.tabs.map((tab) => tab.path)).toEqual(['/docs', '/photos'])
  expect(state.activeTabId).toBe(state.tabs[1].id)
  expect(state.tabs[0].history).toEqual(['/docs'])
  expect(state.closedTabs).toEqual([])
})

it('ignores empty tab snapshots and falls back for invalid active indices', () => {
  useExplorerStore.getState().startAt('/original')
  useExplorerStore.getState().restoreWorkspace([], 5)
  expect(useExplorerStore.getState().tabs[0].path).toBe('/original')
  useExplorerStore.getState().restoreWorkspace(['/docs'], 99)
  expect(useExplorerStore.getState().activeTabId).toBe(useExplorerStore.getState().tabs[0].id)
})

it('stores virtual folders as rules, allowing the same root in multiple collections', () => {
  const store = useProductivityStore.getState()
  store.saveFolder(' PDFs ', '/docs', ' ext:pdf ')
  store.saveFolder('Large', '/docs', 'size:10mb')
  expect(useProductivityStore.getState().folders.map(({ name, root, query }) => ({ name, root, query }))).toEqual([
    { name: 'PDFs', root: '/docs', query: 'ext:pdf' },
    { name: 'Large', root: '/docs', query: 'size:10mb' }
  ])
  store.removeFolder(useProductivityStore.getState().folders[0].id)
  expect(useProductivityStore.getState().folders).toHaveLength(1)
})

it('rejects empty names, roots and rules and bounds saved collections', () => {
  const store = useProductivityStore.getState()
  store.saveFolder(' ', '/docs', 'ext:pdf')
  store.saveFolder('Docs', '', 'ext:pdf')
  store.saveFolder('Docs', '/docs', '')
  store.saveWorkspace('', snapshot())
  expect(useProductivityStore.getState().folders).toEqual([])
  expect(useProductivityStore.getState().workspaces).toEqual([])
  for (let i = 0; i < 52; i++) store.saveFolder(String(i), '/docs', 'ext:pdf')
  expect(useProductivityStore.getState().folders).toHaveLength(50)
  expect(useProductivityStore.getState().folders[0].name).toBe('2')
})
