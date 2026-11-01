import { listen } from '@tauri-apps/api/event'
import { useEffect, useState } from 'react'
import { errorMessage, formatSize } from '../../lib/format'
import type { Language } from '../../lib/preferences'
import { filesystem } from '../../services/tauri/filesystem'
import { useTransferStore } from '../../stores/transferStore'
import type { TransferProgress as Progress } from '../../types/explorer'
import { Icon } from '../base/Icon'
import { toolMessages } from '../FileTools/messages'
import './styles.css'

type Labels = {
  copying: string
  moving: string
  trashing: string
  cancel: string
  close: string
  done: string
  failed: string
}

export function TransferProgress({ labels, language }: { labels: Labels; language: Language }) {
  const { items: transfers, receive, dismiss, pause } = useTransferStore()
  const [failure, setFailure] = useState<string | null>(null)
  const tools = toolMessages(language)

  useEffect(() => {
    let unlisten: (() => void) | undefined
    let alive = true
    listen<Progress>('cosmarium://transfer-progress', (event) => {
      if (alive) receive(event.payload)
    })
      .then((off) => {
        if (alive) unlisten = off
        else off()
      })
      .catch(() => {})
    return () => {
      alive = false
      unlisten?.()
    }
  }, [receive])

  const items = Object.values(transfers)
  if (items.length === 0) return null

  return (
    <div className="transfer-panel">
      {failure && <p role="alert">{failure}</p>}
      {items.map((item) => {
        const ratio = item.total_bytes > 0 ? item.done_bytes / item.total_bytes : item.total_files > 0 ? item.done_files / item.total_files : 0
        const percent = Math.min(100, Math.round(ratio * 100))
        const remaining = item.speed > 0 ? Math.ceil(Math.max(0, item.total_bytes - item.done_bytes) / item.speed) : null
        const title = item.kind === 'trash' ? labels.trashing : item.cut ? labels.moving : labels.copying
        return (
          <section className="transfer-card" key={item.id}>
            <div className="transfer-card__top">
              <strong>{title}</strong>
              {item.finished ? (
                <button type="button" onClick={() => dismiss(item.id)} aria-label={labels.close}>
                  <Icon name="close" size={12} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void filesystem.cancelTransfer(item.id).catch((reason) => setFailure(errorMessage(reason)))}
                  aria-label={labels.cancel}
                  title={labels.cancel}
                >
                  <Icon name="close" size={12} />
                </button>
              )}
            </div>
            {!item.finished && item.kind !== 'trash' && (
              <button
                type="button"
                onClick={() =>
                  void filesystem
                    .pauseTransfer(item.id, !item.paused)
                    .then(() => pause(item.id, !item.paused))
                    .catch((reason) => setFailure(errorMessage(reason)))
                }
              >
                {item.paused ? tools.resume : tools.pause}
              </button>
            )}
            <div className="transfer-card__bar">
              <i style={{ width: `${item.finished && !item.error && !item.cancelled ? 100 : percent}%` }} />
            </div>
            <small>
              {item.error
                ? `${labels.failed}: ${item.error.split('\n')[0]}`
                : item.finished
                  ? item.cancelled
                    ? tools.cancelled
                    : labels.done
                  : item.queued
                    ? tools.queued
                    : item.paused
                      ? tools.pause
                      : `${percent}% — ${item.done_files}/${item.total_files} · ${formatSize(item.done_bytes, language)} / ${formatSize(item.total_bytes, language)} · ${formatSize(item.speed, language)}/s${remaining === null ? '' : ` · ${remaining}s ${tools.remaining}`}`}
            </small>
          </section>
        )
      })}
    </div>
  )
}
