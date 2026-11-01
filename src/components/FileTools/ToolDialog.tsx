import { type ReactNode, useId } from 'react'
import { Button } from '../base/Button'
import { Dialog } from '../base/Dialog'
import type { ToolMessages } from './messages'
import './styles.css'

type Props = { title: string; labels: ToolMessages; busy?: boolean; error?: string | null; onClose: () => void; children: ReactNode }

export function ToolDialog({ title, labels, busy = false, error, onClose, children }: Props) {
  const id = useId()
  return (
    <Dialog
      backdropClass="tool-backdrop"
      dismissLabel={title}
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      <section className="tool-dialog" aria-labelledby={id} aria-busy={busy}>
        <header>
          <h2 id={id}>{title}</h2>
          <Button disabled={busy} onClick={onClose}>
            {labels.close}
          </Button>
        </header>
        {error && (
          <div role="alert">
            <p>{error}</p>
            <small>{labels.advice}</small>
          </div>
        )}
        {busy && <p role="status">{labels.loading}</p>}
        {children}
      </section>
    </Dialog>
  )
}
