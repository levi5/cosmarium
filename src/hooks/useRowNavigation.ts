import { useCallback, useEffect, useRef, useState } from 'react'

const NAVIGATION_KEYS = new Set(['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageDown', 'PageUp'])

type Options = {
  paths: string[]
  activePath: string | null
  rowHeight: number
  headerHeight?: number
  scrollRef: React.RefObject<HTMLElement | null>
  onSelect: (paths: string[]) => void
  onActivate: (path: string) => void
}

type CursorContext = {
  current: number
  total: number
  columns: number
  page: number
}

const CURSOR_MOVES: Record<string, (context: CursorContext) => number> = {
  ArrowDown: ({ current, columns }) => (current < 0 ? 0 : current) + columns,
  ArrowUp: ({ current, columns }) => (current < 0 ? 0 : current) - columns,
  ArrowRight: ({ current }) => (current < 0 ? 0 : current) + 1,
  ArrowLeft: ({ current }) => (current < 0 ? 0 : current) - 1,
  PageDown: ({ current, page }) => (current < 0 ? 0 : current) + page,
  PageUp: ({ current, page }) => (current < 0 ? 0 : current) - page,
  Home: () => 0,
  End: ({ total }) => total - 1
}

function resolveCursor(key: string, context: CursorContext): number {
  const move = CURSOR_MOVES[key]
  if (!move) return context.current
  return Math.max(0, Math.min(context.total - 1, move(context)))
}

function resolveScrollTop(scrollTop: number, viewportHeight: number, rowTop: number, rowHeight: number): number {
  if (rowTop < scrollTop) return rowTop
  const overflowBelow = rowTop + rowHeight - (scrollTop + viewportHeight)
  return overflowBelow > 0 ? scrollTop + overflowBelow : scrollTop
}

function columnCount(element: HTMLElement | null): number {
  if (!element) return 1
  const columns = window.getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length
  return Math.max(1, columns)
}

function pageSize(viewportHeight: number, rowHeight: number, headerHeight: number): number {
  if (rowHeight <= 0) return 1
  return Math.max(1, Math.floor((Math.max(viewportHeight, rowHeight) - headerHeight) / rowHeight) - 1)
}

export function useRowNavigation({ paths, activePath, rowHeight, headerHeight = 0, scrollRef, onSelect, onActivate }: Options) {
  const [cursor, setCursor] = useState(-1)
  const cursorRef = useRef(-1)
  const anchorRef = useRef<number | null>(null)
  const pendingFocusRef = useRef<number | null>(null)
  cursorRef.current = cursor

  useEffect(() => {
    if (!activePath) return
    const index = paths.indexOf(activePath)
    if (index < 0 || index === cursorRef.current) return
    cursorRef.current = index
    setCursor(index)
  }, [activePath, paths])

  useEffect(() => {
    const index = pendingFocusRef.current
    if (index === null) return
    const node = scrollRef.current?.querySelector<HTMLElement>(`[data-row-index="${index}"]`)
    if (!node) return
    pendingFocusRef.current = null
    node.focus()
  })

  const scrollIntoView = useCallback(
    (index: number) => {
      const element = scrollRef.current
      if (!element || rowHeight <= 0) return
      element.scrollTop = resolveScrollTop(element.scrollTop, element.clientHeight, index * rowHeight + headerHeight, rowHeight)
    },
    [headerHeight, rowHeight, scrollRef]
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!NAVIGATION_KEYS.has(event.key)) return
      const total = paths.length
      if (total === 0) return
      const element = scrollRef.current
      const current = cursorRef.current >= 0 && cursorRef.current < total ? cursorRef.current : paths.indexOf(activePath ?? '')
      const next = resolveCursor(event.key, {
        current,
        total,
        columns: columnCount(element),
        page: pageSize(element?.clientHeight ?? 0, rowHeight, headerHeight)
      })
      event.preventDefault()
      const path = paths[next]
      if (!path) return
      scrollIntoView(next)
      if (cursorRef.current !== next) {
        cursorRef.current = next
        setCursor(next)
      }
      if (event.shiftKey) {
        const anchor = anchorRef.current ?? Math.max(0, current)
        onSelect(paths.slice(Math.min(anchor, next), Math.max(anchor, next) + 1))
      } else {
        anchorRef.current = next
        onSelect([path])
        pendingFocusRef.current = next
      }
      onActivate(path)
    },
    [activePath, headerHeight, onActivate, onSelect, paths, rowHeight, scrollIntoView, scrollRef]
  )

  const onRowFocus = useCallback((index: number) => {
    anchorRef.current = index
    if (cursorRef.current === index) return
    cursorRef.current = index
    setCursor(index)
  }, [])

  const tabIndexFor = useCallback((index: number) => (index === cursor || (cursor < 0 && index === 0) ? 0 : -1), [cursor])

  return { cursor, tabIndexFor, onRowFocus, handleKeyDown }
}
