import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Button } from '../base/Button'
import { Dialog } from '../base/Dialog'
import { Icon } from '../base/Icon'
import './styles.css'

type Props = {
  title: string
  placeholder?: string
  initialValue?: string
  confirmLabel: string
  cancelLabel: string
  externalError?: string | null
  onSubmit: (value: string) => void
  onClose: () => void
}

export function PromptDialog({ title, placeholder, initialValue = '', confirmLabel, cancelLabel, externalError, onSubmit, onClose }: Props) {
  const [value, setValue] = useState(initialValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const save = (event: FormEvent) => {
    event.preventDefault()
    const name = value.trim()
    if (!name) return
    onSubmit(name)
  }

  return (
    <Dialog backdropClass="prompt-backdrop" dismissLabel={cancelLabel} onClose={onClose}>
      <form className="prompt-dialog" onSubmit={save} onMouseDown={(event) => event.stopPropagation()}>
        <div className="prompt-dialog__top">
          <strong>{title}</strong>
          <button type="button" onClick={onClose} aria-label={cancelLabel}>
            <Icon name="close" size={14} />
          </button>
        </div>
        <input ref={inputRef} value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} maxLength={128} />
        {externalError && <p className="prompt-dialog__error">{externalError}</p>}
        <div className="prompt-dialog__actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button type="submit" variant="primary" disabled={!value.trim()}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
