import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { filesystem } from '../../services/tauri/filesystem'
import type { FileEntry } from '../../types/explorer'
import { useFileSearch } from './useFileSearch'

vi.mock('../../services/tauri/filesystem', () => ({ filesystem: { searchEntries: vi.fn() } }))
const file: FileEntry = { name: 'a.pdf', path: '/docs/a.pdf', kind: 'file', size: 5, modified: null, accessed: null, hidden: false }
beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  vi.mocked(filesystem.searchEntries).mockResolvedValue([file])
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

it('reruns unchanged virtual-folder rules on refresh and directory updates', async () => {
  const entries: FileEntry[] = []
  const { result, rerender } = renderHook(({ listing }) => useFileSearch('ext:pdf', '/docs', false, true, listing), { initialProps: { listing: entries } })
  await act(async () => vi.advanceTimersByTimeAsync(250))
  expect(result.current.searchResults).toEqual([file])
  expect(filesystem.searchEntries).toHaveBeenCalledOnce()
  act(() => result.current.refresh())
  await act(async () => vi.advanceTimersByTimeAsync(250))
  expect(filesystem.searchEntries).toHaveBeenCalledTimes(2)
  rerender({ listing: [file] })
  await act(async () => vi.advanceTimersByTimeAsync(250))
  expect(filesystem.searchEntries).toHaveBeenCalledTimes(3)
})

it('ignores late results from a previously opened virtual folder', async () => {
  let finish!: (entries: FileEntry[]) => void
  vi.mocked(filesystem.searchEntries).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve
    })
  )
  const { result, rerender } = renderHook(({ root }) => useFileSearch('ext:pdf', root, false, true), { initialProps: { root: '/old' } })
  await act(async () => vi.advanceTimersByTimeAsync(250))
  rerender({ root: '/docs' })
  await act(async () => vi.advanceTimersByTimeAsync(250))
  expect(result.current.searchResults).toEqual([file])
  await act(async () => finish([]))
  expect(result.current.searchResults).toEqual([file])
})
