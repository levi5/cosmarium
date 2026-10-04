import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { clampToViewport } from '../../../lib/format'
import './styles.css'

type Props = {
  anchorX: number
  anchorY: number
  onClose: () => void
  children: ReactNode
}

const FALLBACK_PANEL_WIDTH_PX = 180
const FALLBACK_PANEL_HEIGHT_PX = 120

export function ContextMenu({ anchorX, anchorY, onClose, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<MenuPosition | null>(null)

  useLayoutEffect(() => {
    const panel = ref.current
    const width = panel?.offsetWidth ?? FALLBACK_PANEL_WIDTH_PX
    const height = panel?.offsetHeight ?? FALLBACK_PANEL_HEIGHT_PX
    setPosition({
      left: clampToViewport(anchorX, width, window.innerWidth),
      top: clampToViewport(anchorY, height, window.innerHeight)
    })
  }, [anchorX, anchorY])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose()
    }
    const onBlur = () => onClose()
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('mousedown', onPointerDown, true)
    window.addEventListener('blur', onBlur)
    window.addEventListener('resize', onClose)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('mousedown', onPointerDown, true)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('resize', onClose)
    }
  }, [onClose])

  if (!position) return null
  return createPortal(
    <div ref={ref} className="context-menu" style={{ left: position.left, top: position.top }} role="menu">
      {children}
    </div>,
    document.body
  )
}

type MenuPosition = { left: number; top: number }
