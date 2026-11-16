import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useVirtualList } from './useVirtualList'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('bounds the initial render of a 100,000-entry directory before measuring', () => {
  const { result } = renderHook(() => useVirtualList({ count: 100000, itemHeight: 42 }))
  expect(result.current.window.start).toBe(0)
  expect(result.current.window.count).toBe(18)
  expect(result.current.window.paddingBottom).toBe((100000 - 18) * 42)
})

it('clamps the window after a scrolled directory shrinks', () => {
  const { result, rerender } = renderHook(({ count }) => useVirtualList({ count, itemHeight: 42 }), { initialProps: { count: 100000 } })
  const element = document.createElement('div')
  Object.defineProperty(result.current.scrollRef, 'current', { configurable: true, value: element })
  element.scrollTop = 90000 * 42
  act(() => result.current.onScroll())
  expect(result.current.window.start).toBeGreaterThan(80000)
  rerender({ count: 3 })
  expect(result.current.window).toEqual({ start: 0, count: 3, total: 3, paddingTop: 0, paddingBottom: 0 })
  rerender({ count: 0 })
  expect(result.current.window).toEqual({ start: 0, count: 0, total: 0, paddingTop: 0, paddingBottom: 0 })
})

it('preserves full rendering when virtualization is disabled', () => {
  const { result } = renderHook(() => useVirtualList({ count: 300, itemHeight: 42, enabled: false }))
  expect(result.current.window).toEqual({ start: 0, count: 300, total: 300, paddingTop: 0, paddingBottom: 0 })
})
