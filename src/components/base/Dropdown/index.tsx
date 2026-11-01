import { type ReactNode, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useContextMenu } from '../../../hooks/useContextMenu'
import { clampToViewport } from '../../../lib/format'
import './styles.css'

type Props = { anchor: HTMLElement | null; onClose: () => void; children: ReactNode }

export function Dropdown({ anchor, onClose, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ left: 0, top: 0 })
  useContextMenu(ref, onClose, anchor)
  useLayoutEffect(() => {
    const panel = ref.current
    if (!anchor || !panel) return
    const update = () => {
      const rect = anchor.getBoundingClientRect()
      const { width, height } = panel.getBoundingClientRect()
      const below = rect.bottom + 6
      const top = below + height > window.innerHeight - 8 && rect.top - height - 6 >= 8 ? rect.top - height - 6 : below
      setPosition({ left: clampToViewport(rect.left, width, window.innerWidth), top: clampToViewport(top, height, window.innerHeight) })
    }
    update()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(panel)
    return () => observer?.disconnect()
  }, [anchor])
  if (!anchor) return null
  return createPortal(
    <div ref={ref} className="dropdown" style={position} role="menu">
      {children}
    </div>,
    document.body
  )
}
