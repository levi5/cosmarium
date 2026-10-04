import { useEffect, useState } from 'react'
import { Button } from '../base/Button'
import { Dialog } from '../base/Dialog'
import { Icon } from '../base/Icon'
import { FileIcon } from '../FileIcon'
import '../../components/FileIcon/styles.css'
import type { ConflictAction, ConflictResolution, TransferConflict } from '../../types/explorer'
import './styles.css'

type Labels = {
  title: string
  message: string
  replace: string
  skip: string
  keepBoth: string
  applyToAll: string
  cancel: string
  cont: string
}

type Props = {
  conflicts: TransferConflict[]
  fileCount: number
  labels: Labels
  onConfirm: (resolutions: ConflictResolution[]) => void
  onClose: () => void
}

const actions: ConflictAction[] = ['replace', 'skip', 'keep_both']

export function ConflictDialog({ conflicts, fileCount, labels, onConfirm, onClose }: Props) {
  const [choices, setChoices] = useState<Record<string, ConflictAction>>(() =>
    Object.fromEntries(conflicts.map((item) => [item.name, 'keep_both' as ConflictAction]))
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const applyToAll = (action: ConflictAction) => setChoices(Object.fromEntries(conflicts.map((item) => [item.name, action])))

  const submit = () => onConfirm(conflicts.map((item) => ({ name: item.name, action: choices[item.name] ?? 'skip' })))

  return (
    <Dialog backdropClass="conflict-backdrop" dismissLabel={labels.cancel} onClose={onClose}>
      <section className="conflict-dialog">
        <div className="conflict-dialog__top">
          <div>
            <strong>{labels.title}</strong>
            <p>{labels.message.replace('{count}', String(fileCount))}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={labels.cancel}>
            <Icon name="close" size={14} />
          </button>
        </div>
        <div className="conflict-dialog__apply-all">
          <span>{labels.applyToAll}</span>
          <div>
            {actions.map((action) => (
              <button key={action} type="button" onClick={() => applyToAll(action)}>
                {labels[action === 'keep_both' ? 'keepBoth' : action]}
              </button>
            ))}
          </div>
        </div>
        <div className="conflict-dialog__list">
          {conflicts.map((item) => (
            <div className="conflict-row" key={item.name}>
              <FileIcon entry={{ name: item.name, kind: item.is_dir ? 'directory' : 'file' }} size="small" />
              <span className="conflict-row__name" title={item.name}>
                {item.name}
              </span>
              <div className="conflict-row__choices">
                {actions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    className={choices[item.name] === action ? 'is-active' : ''}
                    onClick={() => setChoices((current) => ({ ...current, [item.name]: action }))}
                  >
                    {labels[action === 'keep_both' ? 'keepBoth' : action]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="conflict-dialog__actions">
          <Button variant="ghost" onClick={onClose}>
            {labels.cancel}
          </Button>
          <Button variant="primary" onClick={submit}>
            {labels.cont}
          </Button>
        </div>
      </section>
    </Dialog>
  )
}
