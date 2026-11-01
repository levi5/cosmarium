import { type ReactNode, useEffect, useState } from 'react'
import { createTranslator } from '../../lib/i18n'
import type { Language } from '../../lib/preferences'
import { Icon } from '../base/Icon'
import { IconButton } from '../base/IconButton'
import { toolMessages } from '../FileTools/messages'

type Props = { path: string; language: Language; onNavigate: (path: string) => void; onUp: () => void; onRefresh: () => void; children?: ReactNode }

export function PaneToolbar({ path, language, onNavigate, onUp, onRefresh, children }: Props) {
  const [input, setInput] = useState(path)
  const t = createTranslator(language)
  const labels = toolMessages(language)
  useEffect(() => setInput(path), [path])
  return (
    <div className="pane-toolbar">
      <IconButton icon="up" label={t('goUp')} onClick={onUp} />
      <form
        className="breadcrumb pane-toolbar__location"
        onSubmit={(event) => {
          event.preventDefault()
          if (input.trim()) onNavigate(input.trim())
        }}
      >
        <Icon name="folder" size={16} />
        <input className="breadcrumb__input" aria-label={labels.path} title={path} value={input} onChange={(event) => setInput(event.target.value)} />
        <IconButton icon="arrow" label={labels.path} type="submit" />
      </form>
      <IconButton icon="refresh" label={t('refresh')} onClick={onRefresh} />
      {children}
    </div>
  )
}
