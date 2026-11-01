import { useMemo, useState } from 'react'
import type { FileEntry } from '../../types/explorer'
import { Button } from '../base/Button'
import { toolsApi } from './api'
import type { ToolMessages } from './messages'
import { planRename, validRenamePlan } from './rename'
import { ToolDialog } from './ToolDialog'
import { useTask } from './useTask'

type Props = { entries: FileEntry[]; labels: ToolMessages; onClose: () => void; onRenamed: (entries: FileEntry[]) => void }

export function BatchRenameDialog({ entries, labels, onClose, onRenamed }: Props) {
  const [options, setOptions] = useState({ find: '', replace: '', prefix: '', number: false })
  const { busy, error, run } = useTask()
  const plan = useMemo(() => planRename(entries, options), [entries, options])
  const valid = validRenamePlan(plan)
  const changed = plan.some((item, index) => item.newName !== entries[index].name)
  return (
    <ToolDialog title={labels.batchRename} labels={labels} busy={busy} error={error} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (valid && changed)
            void run(async () => {
              onRenamed(await toolsApi.rename(plan))
              onClose()
            })
        }}
      >
        <fieldset disabled={busy}>
          {(['find', 'replace', 'prefix'] as const).map((key) => (
            <label key={key}>
              {labels[key]}
              <input value={options[key]} onChange={(event) => setOptions({ ...options, [key]: event.target.value })} />
            </label>
          ))}
          <label>
            <span>
              <input type="checkbox" checked={options.number} onChange={(event) => setOptions({ ...options, number: event.target.checked })} /> {labels.number}
            </span>
          </label>
          <table>
            <caption>{labels.preview}</caption>
            <thead>
              <tr>
                <th>{labels.original}</th>
                <th>{labels.result}</th>
              </tr>
            </thead>
            <tbody>
              {plan.map((item, index) => (
                <tr key={item.path}>
                  <td>{entries[index].name}</td>
                  <td>{item.newName}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!valid && <p role="alert">{labels.invalid}</p>}
          <Button type="submit" variant="primary" disabled={!valid || !changed}>
            {labels.apply}
          </Button>
        </fieldset>
      </form>
    </ToolDialog>
  )
}
