import { type RefObject, useEffect } from 'react'

const focusableSelector = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]'
const dialogs: HTMLElement[] = []

export function useDialogFocus(ref: RefObject<HTMLDivElement>, onClose: () => void) {
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialogs.push(element)
    const focusable = () => [...element.querySelectorAll<HTMLElement>(focusableSelector)].filter((item) => !item.closest('[aria-hidden="true"]'))
    const initial = element.querySelector<HTMLElement>('[autofocus], input, select, textarea') ?? focusable()[0] ?? element
    initial.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (dialogs[dialogs.length - 1] !== element) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        onClose()
      }
      if (event.key !== 'Tab') return
      const items = focusable()
      const first = items[0] ?? element
      const last = items[items.length - 1] ?? element
      if (event.shiftKey && (document.activeElement === first || document.activeElement === element)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === element)) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      dialogs.splice(dialogs.indexOf(element), 1)
      document.removeEventListener('keydown', onKeyDown, true)
      if (previous?.isConnected) previous.focus()
    }
  }, [ref, onClose])
}
