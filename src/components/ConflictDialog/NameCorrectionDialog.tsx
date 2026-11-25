import { useId } from 'react'
import type { Language } from '../../lib/preferences'
import type { TransferNameChange } from '../../types/explorer'
import { Button } from '../base/Button'
import { Dialog } from '../base/Dialog'
import './styles.css'

export function NameCorrectionDialog({
  changes,
  language,
  onConfirm,
  onClose
}: {
  changes: TransferNameChange[]
  language: Language
  onConfirm: () => void
  onClose: () => void
}) {
  const id = useId()
  const pt = language === 'pt-BR'
  const title = pt ? 'Corrigir nomes para copiar?' : 'Fix names to copy?'
  return (
    <Dialog backdropClass="conflict-backdrop" dismissLabel={title} onClose={onClose}>
      <section className="conflict-dialog" aria-labelledby={id}>
        <div className="conflict-dialog__top">
          <div>
            <strong id={id}>{title}</strong>
            <p>
              {pt
                ? 'O destino FAT/exFAT/NTFS não aceita alguns nomes. Corrigir altera apenas os nomes na cópia, nunca os originais. Se houver conflitos, você poderá escolher substituir, ignorar ou manter ambos na próxima etapa.'
                : 'The FAT/exFAT/NTFS destination does not accept some names. Fixing changes only the copied names, never the originals. If there are conflicts, you can choose replace, skip or keep both next.'}
            </p>
          </div>
        </div>
        <div className="conflict-dialog__list">
          {changes.map((change) => (
            <div className="name-correction-row" key={change.source}>
              <code>{JSON.stringify(change.source)}</code>
              <span>
                → <code>{JSON.stringify(change.suggested_name)}</code>
              </span>
            </div>
          ))}
        </div>
        <div className="conflict-dialog__actions">
          <Button variant="ghost" onClick={onClose}>
            {pt ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            {pt ? 'Corrigir nomes e continuar' : 'Fix names and continue'}
          </Button>
        </div>
      </section>
    </Dialog>
  )
}
