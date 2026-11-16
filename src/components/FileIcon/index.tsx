import { ArchiveFilled } from '@fluentui/react-icons/svg/archive'
import { CodeFilled } from '@fluentui/react-icons/svg/code'
import { DocumentFilled } from '@fluentui/react-icons/svg/document'
import { DocumentDataFilled } from '@fluentui/react-icons/svg/document-data'
import { DocumentImageFilled } from '@fluentui/react-icons/svg/document-image'
import { DocumentPdfFilled } from '@fluentui/react-icons/svg/document-pdf'
import { DocumentTableFilled } from '@fluentui/react-icons/svg/document-table'
import { DocumentTextFilled } from '@fluentui/react-icons/svg/document-text'
import { DocumentWordFilled } from '@fluentui/react-icons/svg/document-word'
import { FolderFilled } from '@fluentui/react-icons/svg/folder'
import { LockClosedFilled } from '@fluentui/react-icons/svg/lock-closed'
import { MusicNote2Filled } from '@fluentui/react-icons/svg/music-note'
import { VideoClipFilled } from '@fluentui/react-icons/svg/video-clip'
import { type ElementType, useState } from 'react'
import { ARCHIVE_EXTENSIONS, AUDIO_EXTENSIONS, fileExtension, hasExtension, IMAGE_EXTENSIONS, VIDEO_EXTENSIONS } from '../../constants/files'
import { type FileIconSize, ICON_PX } from '../../constants/view'
import { useThumbnail } from '../../hooks/useThumbnail'
import { usePreferences } from '../../lib/preferences'
import type { FileEntry } from '../../types/explorer'
import './styles.css'

type Glyph = { icon: ElementType; color: string }

const byExt: Record<string, Glyph> = {
  pdf: { icon: DocumentPdfFilled, color: '#E2574C' },
  doc: { icon: DocumentWordFilled, color: '#4C8DF6' },
  docx: { icon: DocumentWordFilled, color: '#4C8DF6' },
  xls: { icon: DocumentTableFilled, color: '#2FA36B' },
  xlsx: { icon: DocumentTableFilled, color: '#2FA36B' },
  csv: { icon: DocumentTableFilled, color: '#2FA36B' },
  ppt: { icon: DocumentDataFilled, color: '#E2733B' },
  pptx: { icon: DocumentDataFilled, color: '#E2733B' },
  txt: { icon: DocumentTextFilled, color: '#9AA4B2' },
  md: { icon: DocumentTextFilled, color: '#9AA4B2' },
  log: { icon: DocumentTextFilled, color: '#9AA4B2' },
  ini: { icon: DocumentTextFilled, color: '#9AA4B2' },
  html: { icon: CodeFilled, color: '#4C8DF6' },
  htm: { icon: CodeFilled, color: '#4C8DF6' },
  py: { icon: CodeFilled, color: '#4C8DF6' },
  js: { icon: CodeFilled, color: '#4C8DF6' },
  mjs: { icon: CodeFilled, color: '#4C8DF6' },
  cjs: { icon: CodeFilled, color: '#4C8DF6' },
  ts: { icon: CodeFilled, color: '#4C8DF6' },
  tsx: { icon: CodeFilled, color: '#4C8DF6' },
  jsx: { icon: CodeFilled, color: '#4C8DF6' },
  css: { icon: CodeFilled, color: '#4C8DF6' },
  scss: { icon: CodeFilled, color: '#4C8DF6' },
  less: { icon: CodeFilled, color: '#4C8DF6' },
  json: { icon: CodeFilled, color: '#2FA36B' },
  xml: { icon: CodeFilled, color: '#2FA36B' },
  yaml: { icon: CodeFilled, color: '#2FA36B' },
  yml: { icon: CodeFilled, color: '#2FA36B' },
  toml: { icon: CodeFilled, color: '#2FA36B' }
}

function glyphFor(name: string): Glyph {
  if (hasExtension(name, IMAGE_EXTENSIONS)) return { icon: DocumentImageFilled, color: '#4C9BE8' }
  if (hasExtension(name, VIDEO_EXTENSIONS)) return { icon: VideoClipFilled, color: '#9B7CFF' }
  if (hasExtension(name, AUDIO_EXTENSIONS)) return { icon: MusicNote2Filled, color: '#E8A33D' }
  if (hasExtension(name, ARCHIVE_EXTENSIONS)) return { icon: ArchiveFilled, color: '#E8A33D' }
  return byExt[fileExtension(name)] ?? { icon: DocumentFilled, color: '#9AA4B2' }
}

type FileIconEntry = FileEntry | { name: string; kind: 'directory' | 'file'; protected?: boolean }

export function FileIcon({ entry, size = 'small' }: { entry: FileIconEntry; size?: FileIconSize }) {
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const { language } = usePreferences()
  const protection = entry.protected ? (
    <span
      className="files-icon__protection"
      role="img"
      aria-label={language === 'pt-BR' ? 'Acesso restrito ou somente leitura' : 'Restricted access or read-only'}
      title={language === 'pt-BR' ? 'Acesso restrito ou somente leitura' : 'Restricted access or read-only'}
    >
      <LockClosedFilled fontSize={10} aria-hidden="true" />
    </span>
  ) : null
  const { ref, key, source } = useThumbnail(entry as FileEntry)
  const thumbError = failedKey === key

  if (entry.kind === 'directory') {
    return (
      <span ref={ref} className={`files-icon files-icon--${size}`}>
        <FolderFilled fontSize={ICON_PX[size]} style={{ color: '#E5A93C' }} aria-hidden="true" />
        {protection}
      </span>
    )
  }

  if (!thumbError && source) {
    return (
      <span ref={ref} className={`files-icon files-icon--thumb files-icon--${size}`}>
        <img src={source} alt="" loading="lazy" decoding="async" onError={() => setFailedKey(key)} />
        {protection}
      </span>
    )
  }

  const { icon: GlyphIcon, color } = glyphFor(entry.name)
  return (
    <span ref={ref} className={`files-icon files-icon--${size}`}>
      <GlyphIcon fontSize={ICON_PX[size]} style={{ color }} aria-hidden="true" />
      {protection}
    </span>
  )
}
