import { useLayoutEffect, useRef, useState } from 'react'
import { clampToViewport } from '../lib/format'

type MenuPosition = { left: number; top: number }

export function useMenuPosition(anchorX: number, anchorY: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<MenuPosition>({ left: anchorX, top: anchorY })

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    setPosition({
      left: clampToViewport(anchorX, element.offsetWidth, window.innerWidth),
      top: clampToViewport(anchorY, element.offsetHeight, window.innerHeight)
    })
  }, [anchorX, anchorY])

  return { ref, position }
}
