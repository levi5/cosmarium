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
  busy?: boolean
  allowEmpty?: boolean
  onSubmit: (value: string) => void
  onClose: () => void
}

export function PromptDialog({
  title,
  placeholder,
  initialValue = '',
  confirmLabel,
  cancelLabel,
  externalError,
  busy = false,
  allowEmpty = false,
  onSubmit,
  onClose
}: Props) {
  const [value, setValue] = useState(initialValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const save = (event: FormEvent) => {
    event.preventDefault()
    const name = value.trim()
    if ((!name && !allowEmpty) || busy) return
    onSubmit(name)
  }

  return (
    <Dialog
      backdropClass="prompt-backdrop"
      dismissLabel={title}
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      <form className="prompt-dialog" onSubmit={save} onMouseDown={(event) => event.stopPropagation()}>
        <div className="prompt-dialog__top">
          <strong>{title}</strong>
          <button type="button" disabled={busy} onClick={onClose} aria-label={cancelLabel}>
            <Icon name="close" size={14} />
          </button>
        </div>
        <input
          ref={inputRef}
          aria-label={title}
          disabled={busy}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          maxLength={128}
        />
        {externalError && <p className="prompt-dialog__error">{externalError}</p>}
        <div className="prompt-dialog__actions">
          <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button type="submit" variant="primary" disabled={busy || (!allowEmpty && !value.trim())}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
