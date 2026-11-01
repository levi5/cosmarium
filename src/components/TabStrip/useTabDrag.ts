import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

const DRAG_THRESHOLD = 5
const EDGE_SIZE = 40

type DragState = {
  id: string
  pointerId: number
  node: HTMLElement
  startX: number
  clientX: number
  startScroll: number
  index: number
  target: number
  active: boolean
  bounds: { left: number; width: number }[]
}

export function useTabDrag(ids: string[], reorder: (from: number, to: number) => void) {
  const listRef = useRef<HTMLDivElement>(null)
  const drag = useRef<DragState | null>(null)
  const suppressClick = useRef(false)
  const frame = useRef<number | null>(null)
  const [preview, setPreview] = useState<{ index: number; target: number; offset: number; width: number } | null>(null)
  const latest = useRef({ ids, reorder })
  latest.current = { ids, reorder }

  const update = () => {
    const state = drag.current
    const list = listRef.current
    if (!state?.active || !list) return
    const source = state.bounds[state.index]
    const first = state.bounds[0]
    const last = state.bounds[state.bounds.length - 1]
    const delta = state.clientX - state.startX + list.scrollLeft - state.startScroll
    const offset = Math.max(first.left - source.left, Math.min(delta, last.left + last.width - source.left - source.width))
    const center = source.left + offset + source.width / 2
    let target = state.index
    for (let index = 0; index < state.bounds.length; index++) {
      if (index === state.index) continue
      const bounds = state.bounds[index]
      if (index < state.index && center <= bounds.left + bounds.width / 2) {
        target = index
        break
      }
      if (index > state.index && center >= bounds.left + bounds.width / 2) target = index
    }
    state.target = target
    setPreview({ index: state.index, target, offset, width: source.width })
  }

  const scroll = () => {
    const list = listRef.current
    const state = drag.current
    if (!list || !state?.active) return
    const bounds = list.getBoundingClientRect()
    const edge = Math.min(EDGE_SIZE, bounds.width / 3)
    const speed =
      state.clientX < bounds.left + edge
        ? -Math.min(1, (bounds.left + edge - state.clientX) / edge) * 12
        : state.clientX > bounds.right - edge
          ? Math.min(1, (state.clientX - bounds.right + edge) / edge) * 12
          : 0
    if (speed) {
      list.scrollLeft += speed
      update()
    }
    frame.current = requestAnimationFrame(scroll)
  }

  const finish = useCallback((commit: boolean) => {
    const state = drag.current
    drag.current = null
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
    if (state?.node.hasPointerCapture(state.pointerId)) state.node.releasePointerCapture(state.pointerId)
    if (state?.active) {
      suppressClick.current = true
      const from = latest.current.ids.indexOf(state.id)
      if (commit && from !== -1) latest.current.reorder(from, state.target)
    }
    setPreview(null)
  }, [])

  useEffect(() => {
    const cancel = () => finish(false)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && drag.current) {
        event.preventDefault()
        cancel()
      }
    }
    window.addEventListener('blur', cancel)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('blur', cancel)
      window.removeEventListener('keydown', onKeyDown)
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    }
  }, [finish])

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>, index: number) => {
    if (event.button !== 0 || event.isPrimary === false || drag.current || (event.target as HTMLElement).closest('button')) return
    const list = listRef.current
    if (!list) return
    suppressClick.current = false
    drag.current = {
      id: ids[index],
      pointerId: event.pointerId,
      node: event.currentTarget,
      startX: event.clientX,
      clientX: event.clientX,
      startScroll: list.scrollLeft,
      index,
      target: index,
      active: false,
      bounds: Array.from(list.children, (node) => {
        const { left, width } = node.getBoundingClientRect()
        return { left, width }
      })
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: ReactPointerEvent) => {
    const state = drag.current
    if (!state || state.pointerId !== event.pointerId) return
    state.clientX = event.clientX
    if (!state.active) {
      if (Math.abs(state.clientX - state.startX) < DRAG_THRESHOLD) return
      state.active = true
      frame.current = requestAnimationFrame(scroll)
    }
    event.preventDefault()
    update()
  }

  const styleFor = (index: number): CSSProperties | undefined => {
    if (!preview) return
    let offset = 0
    if (index === preview.index) offset = preview.offset
    else if (index > preview.index && index <= preview.target) offset = -preview.width
    else if (index < preview.index && index >= preview.target) offset = preview.width
    return { transform: `translateX(${offset}px)` }
  }

  return {
    listRef,
    dragging: preview?.index ?? null,
    styleFor,
    onPointerDown,
    onPointerMove,
    onPointerUp: (event: ReactPointerEvent) => {
      if (event.pointerId !== drag.current?.pointerId) return
      onPointerMove(event)
      finish(true)
    },
    onPointerCancel: () => finish(false),
    consumeClick: () => {
      const suppressed = suppressClick.current
      suppressClick.current = false
      return suppressed
    }
  }
}
