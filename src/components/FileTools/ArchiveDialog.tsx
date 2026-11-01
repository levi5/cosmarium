import { useState } from 'react'
import type { FileEntry } from '../../types/explorer'
import { Button } from '../base/Button'
import { toolsApi } from './api'
import type { ToolMessages } from './messages'
import { ToolDialog } from './ToolDialog'
import { useTask } from './useTask'

type Props = { mode: 'compress' | 'extract'; entries: FileEntry[]; destination: string; labels: ToolMessages; onClose: () => void; onComplete: () => void }

export function ArchiveDialog({ mode, entries, destination, labels, onClose, onComplete }: Props) {
  const [name, setName] = useState(mode === 'compress' ? 'Archive.zip' : entries[0].name.replace(/\.zip$/i, ''))
  const { busy, error, run } = useTask()
  const operations = {
    compress: () =>
      toolsApi.compress(
        entries.map((entry) => entry.path),
        destination,
        name
      ),
    extract: () => toolsApi.extract(entries[0].path, destination, name)
  }
  return (
    <ToolDialog title={labels[mode]} labels={labels} busy={busy} error={error} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void run(async () => {
            await operations[mode]()
            onComplete()
            onClose()
          })
        }}
      >
        <label>
          {labels.name}
          <input required value={name} onChange={(event) => setName(event.target.value)} disabled={busy} />
        </label>
        <Button type="submit" variant="primary" disabled={busy || !name.trim()}>
          {labels.apply}
        </Button>
      </form>
    </ToolDialog>
  )
}
