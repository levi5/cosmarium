import { type ReactNode, useCallback, useRef } from 'react'
import { useDialogFocus } from '../../../hooks/useDialogFocus'
import { Portal } from '../Portal'
import './styles.css'

type Props = {
  backdropClass: string
  dismissLabel: string
  onClose: () => void
  children: ReactNode
}

export function Dialog({ backdropClass, dismissLabel, onClose, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const close = useCallback(() => closeRef.current(), [])
  useDialogFocus(ref, close)

  return (
    <Portal>
      <div ref={ref} className={backdropClass} role="dialog" aria-modal="true" aria-label={dismissLabel} tabIndex={-1}>
        <button type="button" className="dialog-dismiss" aria-label={dismissLabel} onClick={onClose} tabIndex={-1} aria-hidden="true" />
        {children}
      </div>
    </Portal>
  )
}
