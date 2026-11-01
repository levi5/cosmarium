import { type RefObject, useEffect, useRef } from 'react'

export function useContextMenu(ref: RefObject<HTMLDivElement>, onClose: () => void, anchor?: HTMLElement | null) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const menu = ref.current
    if (!menu) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const items = () => [...menu.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
    for (const item of items()) {
      if (!item.hasAttribute('role')) item.setAttribute('role', 'menuitem')
    }
    items()[0]?.focus({ preventScroll: true })
    const close = () => closeRef.current()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Tab') {
        event.preventDefault()
        close()
        return
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      const buttons = items()
      const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
      const next =
        event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
      buttons[next]?.focus()
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!menu.contains(event.target as Node) && !anchor?.contains(event.target as Node)) close()
    }
    const onScroll = (event: Event) => {
      if (!(event.target instanceof Node) || !menu.contains(event.target)) close()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('mousedown', onPointerDown, true)
    const scrollFrame = window.requestAnimationFrame(() => window.addEventListener('scroll', onScroll, true))
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('mousedown', onPointerDown, true)
      window.cancelAnimationFrame(scrollFrame)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', close)
      if (previous?.isConnected && (menu.contains(document.activeElement) || document.activeElement === document.body)) previous.focus({ preventScroll: true })
    }
  }, [ref, anchor])
}
