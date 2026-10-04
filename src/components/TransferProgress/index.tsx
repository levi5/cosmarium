import { listen } from '@tauri-apps/api/event'
import { useEffect, useState } from 'react'
import { filesystem } from '../../services/tauri/filesystem'
import type { TransferProgress as Progress } from '../../types/explorer'
import { Icon } from '../base/Icon'
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

function formatBytes(value: number, language: string) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = value ? Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1) : 0
  return `${new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(value / 1024 ** index)} ${units[index]}`
}

export function TransferProgress({ labels, language }: { labels: Labels; language: string }) {
  const [transfers, setTransfers] = useState<Record<string, Progress>>({})

  useEffect(() => {
    let unlisten: (() => void) | undefined
    listen<Progress>('cosmarium://transfer-progress', (event) => {
      setTransfers((current) => ({ ...current, [event.payload.id]: event.payload }))
    })
      .then((off) => {
        unlisten = off
      })
      .catch(() => {})
    return () => unlisten?.()
  }, [])

  const items = Object.values(transfers)
  if (items.length === 0) return null

  const dismiss = (id: string) =>
    setTransfers((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })

  return (
    <div className="transfer-panel">
      {items.map((item) => {
        const percent = item.total_files > 0 ? Math.round((item.done_files / item.total_files) * 100) : 0
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
                <button type="button" onClick={() => void filesystem.cancelTransfer(item.id)} aria-label={labels.cancel} title={labels.cancel}>
                  <Icon name="close" size={12} />
                </button>
              )}
            </div>
            <div className="transfer-card__bar">
              <i style={{ width: `${item.finished && !item.error ? 100 : percent}%` }} />
            </div>
            <small>
              {item.error
                ? `${labels.failed}: ${item.error.split('\n')[0]}`
                : item.finished
                  ? labels.done
                  : `${percent}% — ${item.done_files}/${item.total_files} · ${formatBytes(item.done_bytes, language)} / ${formatBytes(item.total_bytes, language)}`}
            </small>
          </section>
        )
      })}
    </div>
  )
}
