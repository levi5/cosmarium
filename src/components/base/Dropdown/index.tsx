import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './styles.css'

type Props = {
  anchor: HTMLElement | null
  onClose: () => void
  children: ReactNode
}

export function Dropdown({ anchor, onClose, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  useLayoutEffect(() => {
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const margin = 8
    const panel = ref.current
    const width = panel?.offsetWidth ?? 190
    const height = panel?.offsetHeight ?? 160
    const below = rect.bottom + 6
    const top = below + height > window.innerHeight - margin && rect.top - height - 6 > margin ? rect.top - height - 6 : below
    setPos({
      left: Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin)),
      top: Math.max(margin, Math.min(top, window.innerHeight - height - margin))
    })
  }, [anchor])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (ref.current?.contains(target)) return
      if (anchor?.contains(target)) return
      onClose()
    }
    const onScroll = () => onClose()
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('mousedown', onPointerDown, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('mousedown', onPointerDown, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [anchor, onClose])

  if (!pos) return null
  return createPortal(
    <div ref={ref} className="dropdown" style={{ left: pos.left, top: pos.top }} role="menu">
      {children}
    </div>,
    document.body
  )
}
