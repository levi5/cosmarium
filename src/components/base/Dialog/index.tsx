import { type ReactNode, useEffect } from 'react'
import { Portal } from '../Portal'
import './styles.css'

type Props = {
  backdropClass: string
  dismissLabel: string
  onClose: () => void
  children: ReactNode
}

export function Dialog({ backdropClass, dismissLabel, onClose, children }: Props) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <Portal>
      <div className={backdropClass}>
        <button type="button" className="dialog-dismiss" aria-label={dismissLabel} onClick={onClose} />
        {children}
      </div>
    </Portal>
  )
}
