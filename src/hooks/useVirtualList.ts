import { useCallback, useEffect, useRef, useState } from 'react'

export type VirtualWindow = {
  start: number
  count: number
  total: number
  paddingTop: number
  paddingBottom: number
}

type Options = {
  count: number
  itemHeight: number | null
  overscan?: number
  enabled?: boolean
}

const identity = (count: number): VirtualWindow => ({
  start: 0,
  count,
  total: count,
  paddingTop: 0,
  paddingBottom: 0
})

export function useVirtualList({ count, itemHeight, overscan = 6, enabled = true }: Options): {
  window: VirtualWindow
  scrollRef: React.RefObject<HTMLDivElement>
  onScroll: () => void
} {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewport, setViewport] = useState(0)

  const measure = useCallback(() => {
    const element = scrollRef.current
    if (!element) return
    setScrollTop(element.scrollTop)
    setViewport(element.clientHeight)
  }, [])

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [measure])

  const onScroll = useCallback(() => {
    const element = scrollRef.current
    if (element) setScrollTop(element.scrollTop)
  }, [])

  const range = ((): VirtualWindow => {
    if (!enabled || itemHeight === null || viewport === 0) return identity(count)
    const visible = Math.max(1, Math.ceil(viewport / itemHeight))
    const first = Math.floor(scrollTop / itemHeight)
    const start = Math.max(0, first - overscan)
    const end = Math.min(count, first + visible + overscan)
    return {
      start,
      count: Math.max(0, end - start),
      total: count,
      paddingTop: start * itemHeight,
      paddingBottom: Math.max(0, (count - end) * itemHeight)
    }
  })()

  return { window: range, scrollRef, onScroll }
}
