import { useEffect, useState } from 'react'
import { formatDate, formatSize, parentPath } from '../../lib/format'
import { filesystem } from '../../services/tauri/filesystem'
import type { FileEntry, FolderStats } from '../../types/explorer'
import { Button } from '../base/Button'
import { Dialog } from '../base/Dialog'
import { FileIcon } from '../FileIcon'
import '../FileIcon/styles.css'
import './styles.css'

type Labels = {
  title: string
  name: string
  type: string
  location: string
  size: string
  contains: string
  files: string
  folders: string
  modified: string
  calculating: string
  truncated: string
  ok: string
  cancel: string
}

type Props = {
  entry: FileEntry
  folderLabel: string
  language: string
  labels: Labels
  onClose: () => void
}

export function PropertiesDialog({ entry, folderLabel, language, labels, onClose }: Props) {
  const [stats, setStats] = useState<FolderStats | null>(null)
  const isFolder = entry.kind === 'directory'

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    if (!isFolder) return
    let active = true
    filesystem
      .getFolderStats(entry.path)
      .then((result) => {
        if (active) setStats(result)
      })
      .catch(() => {
        if (active) setStats(null)
      })
    return () => {
      active = false
    }
  }, [entry.path, isFolder])

  const sizeText = isFolder ? (stats ? formatSize(stats.size, language) : labels.calculating) : formatSize(entry.size, language)

  return (
    <Dialog backdropClass="properties-backdrop" dismissLabel={labels.cancel} onClose={onClose}>
      <div className="properties-dialog" role="dialog" aria-modal="true" aria-label={labels.title}>
        <div className="properties-dialog__head">
          <FileIcon entry={entry} size="medium" />
          <div>
            <strong>
              {labels.title} {entry.name}
            </strong>
            <small>{isFolder ? folderLabel : ''}</small>
          </div>
        </div>

        <dl className="properties-dialog__grid">
          <div className="properties-row">
            <dt>{labels.name}</dt>
            <dd>{entry.name}</dd>
          </div>
          <div className="properties-row">
            <dt>{labels.type}</dt>
            <dd>{isFolder ? folderLabel : entry.name.split('.').pop()?.toUpperCase() || '-'}</dd>
          </div>
          <div className="properties-row">
            <dt>{labels.location}</dt>
            <dd title={parentPath(entry.path)}>{parentPath(entry.path)}</dd>
          </div>
          <div className="properties-row">
            <dt>{labels.modified}</dt>
            <dd>{formatDate(entry.modified, language, false)}</dd>
          </div>
          <div className="properties-row properties-row--strong">
            <dt>{labels.size}</dt>
            <dd>{sizeText}</dd>
          </div>
          {isFolder && stats && (
            <div className="properties-row">
              <dt>{labels.contains}</dt>
              <dd>
                {stats.dirs} {labels.folders} · {stats.files} {labels.files}
                {stats.truncated && <em className="properties-dialog__truncated"> ({labels.truncated})</em>}
              </dd>
            </div>
          )}
        </dl>

        <div className="properties-dialog__actions">
          <Button variant="primary" onClick={onClose}>
            {labels.ok}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
