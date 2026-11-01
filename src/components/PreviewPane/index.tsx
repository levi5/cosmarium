import { convertFileSrc } from '@tauri-apps/api/core'
import { lazy, Suspense, useState } from 'react'
import { useTextPreview } from '../../hooks/useTextPreview'
import type { FileEntry } from '../../lib/files'
import type { PreviewType } from '../../lib/format'
import { formatSize } from '../../lib/format'
import type { Language } from '../../lib/preferences'
import { filesystem } from '../../services/tauri/filesystem'
import { IconButton } from '../base/IconButton'
import './styles.css'
import { Dialog } from '../base/Dialog'

const EMPTY_CAPTIONS = `data:text/vtt,WEBVTT%0A%0A`
const PdfPreview = lazy(() => import('./PdfPreview'))

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
  type: PreviewType
  language: Language
  title: string
  labels: Labels
  onClose: () => void
}

export function PreviewPane({ entry, type, language, title, labels, onClose }: Props) {
  const source = convertFileSrc(entry.path)
  const state = useTextPreview(entry.path, type === 'text')
  const [mediaError, setMediaError] = useState<string | null>(null)
  const openLabel = language === 'pt-BR' ? 'Abrir no aplicativo padrão' : 'Open in default application'

  return (
    <Dialog backdropClass="preview-backdrop" dismissLabel={`${title}: ${entry.name}`} onClose={onClose}>
      <section className="preview-pane">
        <div className="preview-pane__top">
          <div className="preview-pane__heading">
            <p>{title}</p>
            <strong title={entry.name}>{entry.name}</strong>
            <small>{formatSize(entry.size, language)}</small>
          </div>
          <div className="preview-pane__actions">
            <IconButton
              icon="arrow"
              label={openLabel}
              onClick={() => void filesystem.openWithDefault(entry.path).catch((reason) => setMediaError(String(reason)))}
            />
            <IconButton icon="close" label={labels.close} onClick={onClose} />
          </div>
        </div>
        <div className="preview-pane__media">
          {mediaError && <p role="alert">{mediaError}</p>}
          {type === 'video' && (
            <video src={source} controls autoPlay>
              <track kind="captions" src={EMPTY_CAPTIONS} />
            </video>
          )}
          {type === 'image' && <img src={source} alt={entry.name} />}
          {type === 'audio' && (
            <audio src={source} controls aria-label={entry.name}>
              <track kind="captions" src={EMPTY_CAPTIONS} />
            </audio>
          )}
          {type === 'pdf' && (
            <Suspense fallback={<p role="status">{labels.loading}</p>}>
              <PdfPreview source={source} language={language} />
            </Suspense>
          )}
          {type === 'text' && (
            <div className="preview-pane__text">
              {state.status === 'loading' && <p className="preview-pane__note">{labels.loading}</p>}
              {state.status === 'error' && (
                <p role="alert" className="preview-pane__note">
                  {state.error}
                </p>
              )}
              {state.status === 'ready' && !state.preview.isText && <p className="preview-pane__note">{labels.binary}</p>}
              {state.status === 'ready' && state.preview.isText && (
                <>
                  <pre>{state.preview.text}</pre>
                  {state.preview.truncated && <p className="preview-pane__note">{labels.truncated}</p>}
                </>
              )}
            </div>
          )}
        </div>
      </section>
    </Dialog>
  )
}
