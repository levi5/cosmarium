import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTransferStore } from './transferStore'

beforeEach(() => useTransferStore.setState({ items: {}, dismissedIds: [], panelOpen: false }))
afterEach(() => vi.useRealTimers())

describe('transfer state', () => {
  it('does not resurrect dismissed notifications when late progress arrives', () => {
    const store = useTransferStore.getState()
    store.enqueue('a', false)
    store.finish('a', 'Permission denied')
    store.dismiss('a')
    store.receive({
      id: 'a',
      cut: false,
      kind: 'copy',
      done_files: 0,
      total_files: 1,
      done_bytes: 0,
      total_bytes: 100,
      finished: true,
      error: 'Permission denied'
    })
    expect(useTransferStore.getState().items).toEqual({})
  })
  it('opens new notifications and preserves the original completion time on late events', () => {
    vi.useFakeTimers()
    const store = useTransferStore.getState()
    store.enqueue('a', false)
    expect(useTransferStore.getState().panelOpen).toBe(true)
    store.finish('a', null)
    const completedAt = useTransferStore.getState().items.a.completedAt
    vi.advanceTimersByTime(1000)
    store.setPanelOpen(false)
    store.receive({ id: 'a', cut: false, kind: 'copy', done_files: 1, total_files: 1, done_bytes: 100, total_bytes: 100, finished: true, error: null })
    expect(useTransferStore.getState().items.a.completedAt).toBe(completedAt)
    expect(useTransferStore.getState().panelOpen).toBe(false)
  })
  it('keeps cancellation and completion when native events arrive late', () => {
    const store = useTransferStore.getState()
    store.enqueue('a', false)
    store.finish('a', null, true)
    store.receive({ id: 'a', cut: false, kind: 'copy', done_files: 0, total_files: 1, done_bytes: 10, total_bytes: 100, finished: true, error: null })
    expect(useTransferStore.getState().items.a).toMatchObject({ finished: true, cancelled: true, queued: false })
  })
  it('tracks queueing, pause, resume and dismissal independently', () => {
    const store = useTransferStore.getState()
    store.enqueue('a', false)
    store.enqueue('b', true)
    store.pause('a', true)
    expect(useTransferStore.getState().items.a).toMatchObject({ queued: true, paused: true })
    store.pause('a', false)
    store.dismiss('a')
    expect(Object.keys(useTransferStore.getState().items)).toEqual(['b'])
  })
})
