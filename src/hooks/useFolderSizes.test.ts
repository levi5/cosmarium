import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { filesystem } from '../services/tauri/filesystem'
import type { FileEntry } from '../types/explorer'
import { useFolderSizes } from './useFolderSizes'

vi.mock('../services/tauri/filesystem', () => ({ filesystem: { getFolderSizes: vi.fn() } }))

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

const folder: FileEntry = { name: 'folder', path: '/folder', kind: 'directory', size: 0, modified: null, accessed: null, hidden: false }

function pendingSizes() {
  let resolve!: (value: Awaited<ReturnType<typeof filesystem.getFolderSizes>>) => void
  vi.mocked(filesystem.getFolderSizes).mockReturnValueOnce(
    new Promise((done) => {
      resolve = done
    })
  )
  return () => resolve({ '/folder': { size: 42, files: 1, dirs: 0, truncated: false } })
}

it('ignores an in-flight response after folder sizes are disabled', async () => {
  const complete = pendingSizes()
  const entries = [folder]
  const { result, rerender } = renderHook(({ enabled }) => useFolderSizes(entries, enabled), { initialProps: { enabled: true } })
  rerender({ enabled: false })
  await act(async () => complete())
  expect(result.current).toEqual({})
})

it('ignores an in-flight response after navigating to an empty folder', async () => {
  const complete = pendingSizes()
  const { result, rerender } = renderHook(({ entries }) => useFolderSizes(entries, true), { initialProps: { entries: [folder] } })
  rerender({ entries: [] })
  await act(async () => complete())
  expect(result.current).toEqual({})
})

it('keeps the pending size scan when a listing refresh replaces the same folders', async () => {
  const complete = pendingSizes()
  const { result, rerender } = renderHook(({ entries }) => useFolderSizes(entries, true), { initialProps: { entries: [folder] } })
  rerender({ entries: [{ ...folder, modified: 123 }] })
  expect(filesystem.getFolderSizes).toHaveBeenCalledTimes(1)
  await act(async () => complete())
  expect(result.current).toEqual({ '/folder': 42 })
})

it('does not restart size scans when the folder order changes', async () => {
  const complete = pendingSizes()
  const other = { ...folder, path: '/other', name: 'other' }
  const { rerender } = renderHook(({ entries }) => useFolderSizes(entries, true), { initialProps: { entries: [folder, other] } })
  rerender({ entries: [{ ...other }, { ...folder }] })
  expect(filesystem.getFolderSizes).toHaveBeenCalledTimes(1)
  await act(async () => complete())
})
