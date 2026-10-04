import { Button } from '../base/Button'
import { Dialog } from '../base/Dialog'
import { Icon } from '../base/Icon'
import './styles.css'

type Props = {
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  danger?: boolean
  hideCancel?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({ title, message, confirmLabel, cancelLabel, danger, hideCancel, onConfirm, onClose }: Props) {
  return (
    <Dialog backdropClass="confirm-backdrop" dismissLabel={cancelLabel} onClose={onClose}>
      <section className="confirm-dialog">
        <div className={`confirm-dialog__icon${danger ? ' confirm-dialog__icon--danger' : ''}`}>
          <Icon name={danger ? 'trash' : 'info'} size={20} />
        </div>
        <strong>{title}</strong>
        <p>{message}</p>
        <div className="confirm-dialog__actions">
          {!hideCancel && (
            <Button variant="ghost" onClick={onClose}>
              {cancelLabel}
            </Button>
          )}
          <Button variant="primary" className={danger ? 'button--danger' : ''} onClick={onConfirm} autoFocus>
            {confirmLabel}
          </Button>
        </div>
      </section>
    </Dialog>
  )
}
