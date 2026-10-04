import { convertFileSrc } from '@tauri-apps/api/core'
import { useEffect, useState } from 'react'
import type { FileEntry } from '../../lib/files'
import { formatSize } from '../../lib/format'
import type { Language } from '../../lib/preferences'
import { filesystem } from '../../services/tauri/filesystem'
import { Icon } from '../base/Icon'
import './styles.css'
import { Dialog } from '../base/Dialog'

const EMPTY_CAPTIONS = `data:text/vtt,WEBVTT%0A%0A`

type Labels = {
  image: string
  video: string
  text: string
  loading: string
  binary: string
  truncated: string
  size: string
  close: string
}

type Props = {
  entry: FileEntry
  type: 'image' | 'video' | 'text'
  language: Language
  title: string
  labels: Labels
  onClose: () => void
}

export function PreviewPane({ entry, type, language, title, labels, onClose }: Props) {
  const source = convertFileSrc(entry.path)
  const [text, setText] = useState<string | null>(null)
  const [isText, setIsText] = useState(false)
  const [truncated, setTruncated] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (type !== 'text') return
    let cancelled = false
    setText(null)
    setFailed(false)
    filesystem
      .readTextPreview(entry.path)
      .then((preview) => {
        if (cancelled) return
        setIsText(preview.isText)
        setTruncated(preview.truncated)
        setText(preview.isText ? preview.text : null)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [type, entry.path])

  return (
    <Dialog backdropClass="preview-backdrop" dismissLabel={labels.close} onClose={onClose}>
      <section className="preview-pane">
        <div className="preview-pane__top">
          <div>
            <p>{title}</p>
            <strong>{entry.name}</strong>
            <small>{formatSize(entry.size, language)}</small>
          </div>
          <button type="button" onClick={onClose} aria-label={labels.close}>
            <Icon name="close" size={14} />
          </button>
        </div>
        <div className="preview-pane__media">
          {type === 'video' && (
            <video src={source} controls autoPlay>
              <track kind="captions" src={EMPTY_CAPTIONS} />
            </video>
          )}
          {type === 'image' && <img src={source} alt={entry.name} />}
          {type === 'text' && (
            <div className="preview-pane__text">
              {text === null && !failed && <p className="preview-pane__note">{labels.loading}</p>}
              {failed && <p className="preview-pane__note">{labels.binary}</p>}
              {text !== null && !isText && <p className="preview-pane__note">{labels.binary}</p>}
              {text !== null && isText && (
                <>
                  <pre>{text}</pre>
                  {truncated && <p className="preview-pane__note">{labels.truncated}</p>}
                </>
              )}
            </div>
          )}
        </div>
      </section>
    </Dialog>
  )
}
