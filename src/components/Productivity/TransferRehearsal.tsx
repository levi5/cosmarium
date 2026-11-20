import { formatSize } from '../../lib/format'
import type { Language } from '../../lib/preferences'
import type { TransferScan } from '../../types/explorer'
import { Button } from '../base/Button'
import { toolMessages } from '../FileTools/messages'
import { ToolDialog } from '../FileTools/ToolDialog'
import { productivityMessages } from './messages'

type Props = {
  plan: { sources: string[]; dest: string; cut: boolean; scan: TransferScan }
  language: Language
  onConfirm: () => void
  onClose: () => void
}

export function TransferRehearsal({ plan, language, onConfirm, onClose }: Props) {
  const l = productivityMessages(language)
  return (
    <ToolDialog title={l.preview} labels={toolMessages(language)} onClose={onClose}>
      <p>{l.safe}</p>
      <p>
        <strong>{plan.cut ? l.move : l.copy}</strong> · {l.files}: {plan.scan.files} · {l.bytes}: {formatSize(plan.scan.bytes, language)} · {l.conflicts}:{' '}
        {plan.scan.conflicts.length}
      </p>
      <p>
        {l.destination}: {plan.dest}
      </p>
      <ul>
        {plan.sources.map((source) => (
          <li key={source}>
            {source} → {plan.dest}
          </li>
        ))}
      </ul>
      <small>{l.caveat}</small>
      <div className="tool-actions">
        <Button onClick={onClose}>{l.cancel}</Button>
        <Button variant="primary" onClick={onConfirm}>
          {plan.scan.conflicts.length ? l.review : l.execute}
        </Button>
      </div>
    </ToolDialog>
  )
}
