import { beforeEach, describe, expect, it } from 'vitest'
import { useTransferStore } from './transferStore'

beforeEach(() => useTransferStore.setState({ items: {} }))

describe('transfer state', () => {
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
