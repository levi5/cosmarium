import { listen } from '@tauri-apps/api/event'
import { useEffect, useMemo, useState } from 'react'
import { errorMessage } from '../../lib/format'
import { createTranslator } from '../../lib/i18n'
import { usePreferences } from '../../lib/preferences'
import { filesystem } from '../../services/tauri/filesystem'
import type { TrashEntry } from '../../types/explorer'
import { Icon } from '../base/Icon'
import { ConfirmDialog } from '../ConfirmDialog'
import './styles.css'

type Labels = {
  name: string
  origin: string
  deletedAt: string
  restore: string
  restoreTitle: string
  restoreMessage: string
  emptyTrash: string
  emptyTrashTitle: string
  emptyTrashMessage: string
  trashEmpty: string
  ok: string
  cancel: string
  loading: string
}

type Props = {
  labels: Labels
  onChanged: () => void
}

export function TrashView({ labels, onChanged }: Props) {
  const { language } = usePreferences()
  const [items, setItems] = useState<TrashEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [failure, setFailure] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [restoreOpen, setRestoreOpen] = useState(false)
  const [emptyOpen, setEmptyOpen] = useState(false)
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null)
  const translateText = useMemo(() => createTranslator(language), [language])

  useEffect(() => {
    let cancelled = false
    let unlisten: (() => void) | undefined

    const load = () => {
      setLoading(true)
      filesystem
        .trashList()
        .then((result) => {
          if (cancelled) return
          setItems(result)
          setFailure(null)
        })
        .catch((reason) => {
          if (!cancelled) setFailure(errorMessage(reason))
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }

    load()
    listen<string>('cosmarium://fs-changed', () => {
      if (!cancelled) load()
    })
      .then((off) => {
        if (cancelled) off()
        else unlisten = off
      })
      .catch(() => {})

    return () => {
      cancelled = true
      unlisten?.()
    }
  }, [])

  const handleRestore = async () => {
    const ids = selected
    setRestoreOpen(false)
    setSelected([])
    try {
      await filesystem.restoreTrashItems(ids)
      onChanged()
    } catch (reason) {
      setNotice({ title: labels.restoreTitle, message: errorMessage(reason) })
      onChanged()
    }
  }

  const handleEmpty = async () => {
    setEmptyOpen(false)
    setSelected([])
    try {
      await filesystem.emptyTrash()
      onChanged()
    } catch (reason) {
      setNotice({ title: labels.emptyTrashTitle, message: errorMessage(reason) })
      onChanged()
    }
  }

  const toggle = (id: string) => setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))

  if (loading) return <div className="browser-message">{translateText('loading')}</div>
  if (failure) {
    return (
      <div className="browser-message browser-message--error">
        {translateText('error')}
        <small>{failure}</small>
      </div>
    )
  }

  return (
    <>
      <div className="trash-actions">
        <button
          type="button"
          className="trash-actions__button"
          disabled={selected.length === 0}
          onClick={() => setRestoreOpen(true)}
          aria-label={labels.restore}
          title={labels.restore}
        >
          <Icon name="arrow" size={16} />
          {labels.restore}
        </button>
        <button
          type="button"
          className="trash-actions__button trash-actions__button--danger"
          disabled={items.length === 0}
          onClick={() => setEmptyOpen(true)}
          aria-label={labels.emptyTrash}
          title={labels.emptyTrash}
        >
          <Icon name="broom" size={15} />
          {labels.emptyTrash}
        </button>
      </div>
      {items.length === 0 ? (
        <div className="browser-message">{labels.trashEmpty}</div>
      ) : (
        <div className="trash-list" role="listbox" aria-multiselectable aria-label={labels.trashEmpty}>
          <div className="trash-list__header">
            <span>{labels.name}</span>
            <span>{labels.origin}</span>
            <span>{labels.deletedAt}</span>
          </div>
          {items.map((item) => (
            <div
              role="option"
              tabIndex={0}
              key={item.id}
              aria-selected={selected.includes(item.id)}
              className={`trash-row ${selected.includes(item.id) ? 'is-selected' : ''}`}
              onClick={(event) => {
                if (event.ctrlKey || event.metaKey) {
                  toggle(item.id)
                  return
                }
                setSelected([item.id])
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  toggle(item.id)
                }
              }}
            >
              <span className="trash-row__name">
                <Icon name={item.is_dir ? 'folder' : 'file'} size={16} />
                <span className="file-title">{item.name}</span>
              </span>
              <span className="trash-row__origin" title={item.original_path}>
                {item.original_path}
              </span>
              <span className="trash-row__date">{item.deleted_at > 0 ? new Date(item.deleted_at * 1000).toLocaleString(language) : '—'}</span>
            </div>
          ))}
        </div>
      )}
      {restoreOpen && (
        <ConfirmDialog
          title={labels.restoreTitle}
          message={labels.restoreMessage.replace('{count}', String(selected.length))}
          confirmLabel={labels.restore}
          cancelLabel={labels.cancel}
          onConfirm={() => void handleRestore()}
          onClose={() => setRestoreOpen(false)}
        />
      )}
      {emptyOpen && (
        <ConfirmDialog
          title={labels.emptyTrashTitle}
          message={labels.emptyTrashMessage.replace('{count}', String(items.length))}
          confirmLabel={labels.emptyTrash}
          cancelLabel={labels.cancel}
          danger
          onConfirm={() => void handleEmpty()}
          onClose={() => setEmptyOpen(false)}
        />
      )}
      {notice && (
        <ConfirmDialog
          title={notice.title}
          message={notice.message}
          confirmLabel={labels.ok}
          cancelLabel={labels.cancel}
          hideCancel
          onConfirm={() => setNotice(null)}
          onClose={() => setNotice(null)}
        />
      )}
    </>
  )
}
