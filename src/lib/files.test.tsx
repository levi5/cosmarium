import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { filesystem } from '../services/tauri/filesystem'
import { useExplorerStore } from '../stores/explorerStore'
import type { FileEntry } from '../types/explorer'
import { FileWorkspaceProvider, useFileWorkspace } from './files'

const watcher = vi.hoisted(() => ({ changed: () => Promise.resolve() }))
vi.mock('../hooks/useDirectoryWatch', () => ({
  useDirectoryWatch: (_path: string, changed: () => Promise<void>) => {
    watcher.changed = changed
    return null
  }
}))
vi.mock('./preferences', () => ({ usePreferences: () => ({ showHidden: false, rememberLastLocation: true }) }))
vi.mock('../services/tauri/filesystem', () => ({
  filesystem: { getLocations: vi.fn(), getVolumes: vi.fn(), takeStartupPath: vi.fn(), listDirectory: vi.fn() }
}))

const file: FileEntry = { name: 'note.txt', path: '/home/note.txt', kind: 'file', size: 1, modified: null, accessed: null, hidden: false }

beforeEach(() => {
  vi.resetAllMocks()
  useExplorerStore.setState({ tabs: [], activeTabId: null, closedTabs: [] })
  vi.mocked(filesystem.getLocations).mockResolvedValue({ home: '/home' } as Awaited<ReturnType<typeof filesystem.getLocations>>)
  vi.mocked(filesystem.getVolumes).mockResolvedValue([])
  vi.mocked(filesystem.takeStartupPath).mockResolvedValue(null)
  vi.mocked(filesystem.listDirectory).mockResolvedValue([file])
})
afterEach(cleanup)

it('keeps the listing visible while automatic updates run in the background', async () => {
  const { result } = renderHook(useFileWorkspace, { wrapper: FileWorkspaceProvider })
  await waitFor(() => expect(result.current.entries).toEqual([file]))
  expect(result.current.loading).toBe(false)
  let finish!: (entries: FileEntry[]) => void
  vi.mocked(filesystem.listDirectory).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve
    })
  )
  let refresh!: Promise<void>
  act(() => {
    refresh = watcher.changed()
  })
  expect(result.current.loading).toBe(false)
  expect(result.current.entries).toEqual([file])
  const updated = { ...file, size: 2 }
  await act(async () => {
    finish([updated])
    await refresh
  })
  expect(result.current.entries).toEqual([updated])
})
