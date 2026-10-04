import { useUndoStore } from '../../stores/undoStore'
import { Icon } from '../base/Icon'
import './styles.css'

export function UndoToast() {
  const toast = useUndoStore((state) => state.toast)
  if (!toast) return null
  return (
    <div className={`undo-toast undo-toast--${toast.tone}`} role="status" aria-live="polite">
      <Icon name={toast.tone === 'ok' ? 'check' : 'info'} size={13} />
      <span>{toast.text}</span>
    </div>
  )
}
