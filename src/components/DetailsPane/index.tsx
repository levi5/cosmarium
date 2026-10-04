import { useEffect, useState } from 'react'
import { entryType, formatDate, formatSize, sizeLabel } from '../../lib/format'
import { createTranslator } from '../../lib/i18n'
import type { Tag } from '../../lib/organizer'
import type { Language } from '../../lib/preferences'
import { filesystem } from '../../services/tauri/filesystem'
import type { FileEntry, FolderStats } from '../../types/explorer'
import { Icon } from '../base/Icon'
import { FileIcon } from '../FileIcon'
import '../FileIcon/styles.css'
import './styles.css'

type Labels = {
  details: string
  name: string
  type: string
  size: string
  modified: string
  accessed: string
  created: string
  contains: string
  items: string
  tags: string
  path: string
  noTags: string
  truncated: string
  close: string
  copyPath: string
  copied: string
}

type Props = {
  entry: FileEntry | null
  folderSizes: Record<string, number>
  tags: Tag[]
  language: Language
  folderLabel: string
  fileLabel: string
  fileTypeLabel: string
  onUnassign: (entry: FileEntry, tagId: string) => void
}

function loadFolderStats(path: string, isStale: () => boolean, onStats: (value: FolderStats | null) => void) {
  filesystem
    .getFolderStats(path)
    .then((result) => {
      if (!isStale()) onStats(result)
    })
    .catch(() => {
      if (!isStale()) onStats(null)
    })
}

function loadTextPreview(path: string, isStale: () => boolean, onPreview: (isText: boolean, text: string | null) => void) {
  filesystem
    .readTextPreview(path)
    .then((preview) => {
      if (isStale()) return
      onPreview(preview.isText, preview.isText ? preview.text : null)
    })
    .catch(() => {
      if (!isStale()) onPreview(false, null)
    })
}

export function DetailsPane({ entry, folderSizes, tags, language, folderLabel, fileLabel, fileTypeLabel, onUnassign }: Props) {
  const translateText = createTranslator(language)
  const [stats, setStats] = useState<FolderStats | null>(null)
  const [text, setText] = useState<string | null>(null)
  const [isText, setIsText] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setStats(null)
    setText(null)
    setIsText(false)
    setCopied(false)
    if (!entry) return
    let cancelled = false
    const isStale = () => cancelled
    const applyPreview = (nextIsText: boolean, nextText: string | null) => {
      setIsText(nextIsText)
      setText(nextText)
    }
    if (entry.kind === 'directory') loadFolderStats(entry.path, isStale, setStats)
    else loadTextPreview(entry.path, isStale, applyPreview)
    return () => {
      cancelled = true
    }
  }, [entry])

  if (!entry) return null

  const labels: Labels = {
    details: translateText('detailsPane'),
    name: translateText('name'),
    type: translateText('type'),
    size: translateText('size'),
    modified: translateText('modified'),
    accessed: translateText('accessedField'),
    created: translateText('createdField'),
    contains: translateText('contains'),
    items: translateText('items'),
    tags: translateText('tagsTitle'),
    path: translateText('pathTitle'),
    noTags: translateText('noTags'),
    truncated: translateText('truncated'),
    close: translateText('closePane'),
    copyPath: translateText('copyPath'),
    copied: translateText('copied')
  }

  const copyPath = () => {
    void navigator.clipboard.writeText(entry.path).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    })
  }

  return (
    <aside className="details-pane" aria-label={labels.details}>
      <div className="details-pane__head">
        <strong>{labels.details}</strong>
        <button type="button" onClick={copyPath} aria-label={labels.copyPath} title={labels.copyPath}>
          <Icon name={copied ? 'check' : 'copy'} size={14} />
        </button>
      </div>

      <div className="details-pane__hero">
        <FileIcon entry={entry} size="large" />
        <strong title={entry.name}>{entry.name}</strong>
      </div>

      <dl className="details-pane__props">
        <dt>{labels.type}</dt>
        <dd>{entryType(entry, folderLabel, fileLabel, fileTypeLabel)}</dd>
        <dt>{labels.size}</dt>
        <dd>{sizeLabel(entry, folderSizes, language)}</dd>
        <dt>{labels.modified}</dt>
        <dd>{formatDate(entry.modified, language)}</dd>
        {entry.accessed ? (
          <>
            <dt>{labels.accessed}</dt>
            <dd>{formatDate(entry.accessed, language)}</dd>
          </>
        ) : null}
        {entry.created ? (
          <>
            <dt>{labels.created}</dt>
            <dd>{formatDate(entry.created, language)}</dd>
          </>
        ) : null}
        {entry.kind === 'directory' && stats && (
          <>
            <dt>{labels.contains}</dt>
            <dd>
              {stats.files} {labels.items}
              {stats.truncated && <em className="details-pane__note"> ({labels.truncated})</em>}
            </dd>
            <dt>{labels.size}</dt>
            <dd>{formatSize(stats.size, language)}</dd>
          </>
        )}
      </dl>

      <div className="details-pane__section">
        <h4>{labels.tags}</h4>
        {tags.length === 0 ? (
          <p className="details-pane__empty">{labels.noTags}</p>
        ) : (
          <ul className="details-pane__tags">
            {tags.map((tag) => (
              <li key={tag.id} style={{ '--tag-color': tag.color } as React.CSSProperties}>
                <i style={{ background: tag.color }} />
                {tag.emoji} {tag.name}
                <button type="button" onClick={() => onUnassign(entry, tag.id)} aria-label={tag.name}>
                  <Icon name="close" size={11} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isText && text !== null && (
        <div className="details-pane__section">
          <h4>{labels.name}</h4>
          <pre className="details-pane__text">{text.slice(0, 4000)}</pre>
        </div>
      )}
    </aside>
  )
}
