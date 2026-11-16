import { listen } from '@tauri-apps/api/event'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { filesystem } from '../services/tauri/filesystem'
import { useDirectoryWatch } from './useDirectoryWatch'

vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }))
vi.mock('../services/tauri/filesystem', () => ({ filesystem: { watchDirectory: vi.fn(), unwatchDirectory: vi.fn() } }))

beforeEach(() => {
  vi.mocked(listen).mockResolvedValue(vi.fn())
  vi.mocked(filesystem.unwatchDirectory).mockResolvedValue(undefined)
})

it('releases a watcher even if subscription finishes after unmount', async () => {
  let finish: (() => void) | undefined
  vi.mocked(filesystem.watchDirectory).mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      })
  )
  const { unmount } = renderHook(() => useDirectoryWatch('/folder', vi.fn()))
  await waitFor(() => expect(filesystem.watchDirectory).toHaveBeenCalledWith('/folder'))
  unmount()
  await act(async () => finish?.())
  await waitFor(() => expect(filesystem.unwatchDirectory).toHaveBeenCalledWith('/folder'))
})

it('reports a watcher failure without hiding directory entries', async () => {
  vi.mocked(filesystem.watchDirectory).mockRejectedValue('Permission denied')
  const { result, unmount } = renderHook(() => useDirectoryWatch('/folder', vi.fn()))
  await waitFor(() => expect(result.current).toBe('Permission denied'))
  unmount()
})

it('coalesces changes during a refresh instead of starting overlapping reads', async () => {
  vi.mocked(filesystem.watchDirectory).mockResolvedValue(undefined)
  let finish!: () => void
  const changed = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        })
    )
    .mockResolvedValue(undefined)
  const { unmount } = renderHook(() => useDirectoryWatch('/folder', changed))
  await waitFor(() => expect(filesystem.watchDirectory).toHaveBeenCalledWith('/folder'))
  const calls = vi.mocked(listen).mock.calls
  const onEvent = calls[calls.length - 1][1]
  const event = { event: 'cosmarium://fs-changed', id: 1, payload: '/folder' }
  await act(async () => {
    onEvent(event)
    onEvent(event)
    onEvent(event)
  })
  expect(changed).toHaveBeenCalledTimes(1)
  await act(async () => finish())
  expect(changed).toHaveBeenCalledTimes(2)
  unmount()
})

it('discards queued refreshes after navigating away', async () => {
  vi.mocked(filesystem.watchDirectory).mockResolvedValue(undefined)
  let finish!: () => void
  const changed = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      })
  )
  const { unmount } = renderHook(() => useDirectoryWatch('/folder', changed))
  await waitFor(() => expect(filesystem.watchDirectory).toHaveBeenCalledWith('/folder'))
  const calls = vi.mocked(listen).mock.calls
  const onEvent = calls[calls.length - 1][1]
  const event = { event: 'cosmarium://fs-changed', id: 1, payload: '/folder' }
  await act(async () => {
    onEvent(event)
    onEvent(event)
  })
  unmount()
  await act(async () => finish())
  expect(changed).toHaveBeenCalledTimes(1)
})
