import { listen } from '@tauri-apps/api/event'
import { useEffect, useState } from 'react'
import { errorMessage, formatSize } from '../../lib/format'
import type { Language } from '../../lib/preferences'
import { filesystem } from '../../services/tauri/filesystem'
import { TRANSFER_NOTICE_TIMEOUT, useTransferStore } from '../../stores/transferStore'
import type { TransferProgress as Progress } from '../../types/explorer'
import { Icon } from '../base/Icon'
import { Portal } from '../base/Portal'
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
  const { items: transfers, panelOpen, setPanelOpen, receive, dismiss, pause } = useTransferStore()
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const interacting = hovered || focused
  const tools = toolMessages(language)
  const items = Object.values(transfers)
  const latestStart = Math.max(0, ...items.map((item) => item.startedAt))
  const hasFailure = items.some((item) => item.error)
  const reportFailure = (item: Progress, reason: unknown) => receive({ ...item, id: crypto.randomUUID(), finished: true, error: errorMessage(reason) })

  useEffect(() => {
    if (!panelOpen || items.length === 0) {
      setHovered(false)
      setFocused(false)
    }
  }, [panelOpen, items.length])

  useEffect(() => {
    if (!panelOpen || latestStart === 0 || interacting || hasFailure) return
    const timer = window.setTimeout(() => setPanelOpen(false), TRANSFER_NOTICE_TIMEOUT)
    return () => window.clearTimeout(timer)
  }, [panelOpen, latestStart, interacting, hasFailure, setPanelOpen])

  useEffect(() => {
    const timers = Object.values(transfers)
      .filter((item) => item.completedAt !== undefined && !item.error)
      .map((item) => window.setTimeout(() => dismiss(item.id), Math.max(0, (item.completedAt ?? 0) + TRANSFER_NOTICE_TIMEOUT - Date.now())))
    return () => timers.forEach(window.clearTimeout)
  }, [transfers, dismiss])

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

  if (items.length === 0 || !panelOpen) return null

  return (
    <Portal>
      <section
        className="transfer-panel"
        id="transfer-notifications"
        aria-label={language === 'pt-BR' ? 'Operações' : 'Operations'}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
        }}
      >
        {items.map((item) => {
          const ratio = item.total_bytes > 0 ? item.done_bytes / item.total_bytes : item.total_files > 0 ? item.done_files / item.total_files : 0
          const percent = Math.min(100, Math.round(ratio * 100))
          const remaining = item.speed > 0 ? Math.ceil(Math.max(0, item.total_bytes - item.done_bytes) / item.speed) : null
          const title = item.kind === 'trash' ? labels.trashing : item.cut ? labels.moving : labels.copying
          return (
            <section className="notification-surface transfer-card" key={item.id}>
              <div className="transfer-card__top">
                <strong>{title}</strong>
                {item.finished ? (
                  <button type="button" onClick={() => dismiss(item.id)} aria-label={labels.close}>
                    <Icon name="close" size={12} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void filesystem.cancelTransfer(item.id).catch((reason) => reportFailure(item, reason))}
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
                      .catch((reason) => reportFailure(item, reason))
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
      </section>
    </Portal>
  )
}
