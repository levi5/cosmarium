import { useState } from 'react'
import type { Language } from '../../lib/preferences'
import type { FileEntry } from '../../types/explorer'
import { Button } from '../base/Button'
import { Dropdown } from '../base/Dropdown'
import { Icon } from '../base/Icon'
import { IconButton } from '../base/IconButton'
import { ArchiveDialog } from './ArchiveDialog'
import { toolsApi } from './api'
import { BatchRenameDialog } from './BatchRenameDialog'
import { DuplicatesDialog } from './DuplicatesDialog'
import { toolMessages } from './messages'
import { ToolDialog } from './ToolDialog'
import { useTask } from './useTask'
import './styles.css'

type Action = 'compress' | 'extract' | 'rename' | 'duplicates'
type Props = {
  entries: FileEntry[]
  path: string
  language: Language
  split: boolean
  onSplit: () => void
  onChanged: () => void
  onRenamed: (entries: FileEntry[]) => void
}

export function FileTools({ entries, path, language, split, onSplit, onChanged, onRenamed }: Props) {
  const labels = toolMessages(language)
  const [action, setAction] = useState<Action | null>(null)
  const [showError, setShowError] = useState(false)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const { error, busy, run } = useTask()
  const close = () => setAction(null)
  const canExtract = entries.length === 1 && entries[0].kind === 'file' && /\.zip$/i.test(entries[0].name)
  const openAction = (next: Action) => {
    setAnchor(null)
    setAction(next)
  }
  const actions = [
    { action: 'compress', icon: 'archive', label: labels.compress, disabled: !entries.length },
    { action: 'extract', icon: 'download', label: labels.extract, disabled: !canExtract },
    { action: 'rename', icon: 'rename', label: labels.batchRename, disabled: !entries.length },
    { action: 'duplicates', icon: 'copy', label: labels.duplicates, disabled: !path }
  ] as const
  return (
    <>
      <span className="explorer-toolbar__divider" />
      <IconButton icon="split" label={labels.split} aria-pressed={split} onClick={onSplit} />
      <IconButton
        icon="more"
        label={labels.tools}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        onClick={(event) => setAnchor(anchor ? null : event.currentTarget)}
      />
      {anchor && (
        <Dropdown anchor={anchor} onClose={() => setAnchor(null)}>
          <button
            type="button"
            role="menuitem"
            className="dropdown__item"
            disabled={busy || !path}
            onClick={() => {
              setAnchor(null)
              setShowError(true)
              void run(() => toolsApi.openTerminal(path))
            }}
          >
            <Icon name="code" size={16} />
            {labels.terminal}
          </button>
          <div className="dropdown__divider" />
          {actions.map((item) => (
            <button key={item.action} type="button" role="menuitem" className="dropdown__item" disabled={item.disabled} onClick={() => openAction(item.action)}>
              <Icon name={item.icon} size={16} />
              {item.label}
            </button>
          ))}
        </Dropdown>
      )}
      {action === 'rename' && <BatchRenameDialog entries={entries} labels={labels} onClose={close} onRenamed={onRenamed} />}
      {(action === 'compress' || action === 'extract') && (
        <ArchiveDialog mode={action} entries={entries} destination={path} labels={labels} onClose={close} onComplete={onChanged} />
      )}
      {action === 'duplicates' && <DuplicatesDialog root={path} labels={labels} language={language} onClose={close} />}
      {showError && error && (
        <ToolDialog title={labels.error} labels={labels} error={error} busy={busy} onClose={() => setShowError(false)}>
          <Button disabled={busy} onClick={() => void run(() => toolsApi.openTerminal(path))}>
            {labels.retry}
          </Button>
        </ToolDialog>
      )}
    </>
  )
}
