import { useState } from 'react'
import { formatSize } from '../../lib/format'
import type { Language } from '../../lib/preferences'
import { Button } from '../base/Button'
import { type DuplicateGroup, toolsApi } from './api'
import type { ToolMessages } from './messages'
import { ToolDialog } from './ToolDialog'
import { useTask } from './useTask'

export function DuplicatesDialog({ root, labels, language, onClose }: { root: string; labels: ToolMessages; language: Language; onClose: () => void }) {
  const [groups, setGroups] = useState<DuplicateGroup[] | null>(null)
  const { busy, error, run } = useTask()
  return (
    <ToolDialog title={labels.duplicates} labels={labels} busy={busy} error={error} onClose={onClose}>
      <p>{labels.readOnly}</p>
      <p>{root}</p>
      <Button disabled={busy} onClick={() => void run(async () => setGroups(await toolsApi.duplicates(root)))}>
        {labels.scan}
      </Button>
      {groups?.length === 0 && <p role="status">{labels.noDuplicates}</p>}
      {groups?.map((group) => (
        <section key={group.paths[0]}>
          <h3>
            {formatSize(group.size, language)} × {group.paths.length}
          </h3>
          <ul>
            {group.paths.map((path) => (
              <li key={path}>{path}</li>
            ))}
          </ul>
        </section>
      ))}
    </ToolDialog>
  )
}
