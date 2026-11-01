import { ArchiveFilled } from '@fluentui/react-icons/svg/archive'
import { DocumentFilled } from '@fluentui/react-icons/svg/document'
import { DocumentImageFilled } from '@fluentui/react-icons/svg/document-image'
import { DocumentPdfFilled } from '@fluentui/react-icons/svg/document-pdf'
import { DocumentTableFilled } from '@fluentui/react-icons/svg/document-table'
import { DocumentTextFilled } from '@fluentui/react-icons/svg/document-text'
import { FolderFilled } from '@fluentui/react-icons/svg/folder'
import { MusicNote2Filled } from '@fluentui/react-icons/svg/music-note'
import { VideoClipFilled } from '@fluentui/react-icons/svg/video-clip'
import type { ElementType } from 'react'
import './styles.css'

type Kind = 'file' | 'directory'

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase()
}

const byExtension: Record<string, { icon: ElementType; color: string }> = {
  pdf: { icon: DocumentPdfFilled, color: '#e2574c' },
  png: { icon: DocumentImageFilled, color: '#4c9be8' },
  jpg: { icon: DocumentImageFilled, color: '#4c9be8' },
  jpeg: { icon: DocumentImageFilled, color: '#4c9be8' },
  webp: { icon: DocumentImageFilled, color: '#4c9be8' },
  mp3: { icon: MusicNote2Filled, color: '#e8a33d' },
  wav: { icon: MusicNote2Filled, color: '#e8a33d' },
  mp4: { icon: VideoClipFilled, color: '#9b7cff' },
  mkv: { icon: VideoClipFilled, color: '#9b7cff' },
  zip: { icon: ArchiveFilled, color: '#e8a33d' },
  csv: { icon: DocumentTableFilled, color: '#2fa36b' },
  md: { icon: DocumentTextFilled, color: '#9aa4b2' },
  txt: { icon: DocumentTextFilled, color: '#9aa4b2' }
}

export function FileIcon({ name, kind, size = 16 }: { name: string; kind: Kind; size?: number }) {
  if (kind === 'directory') {
    return (
      <span className="preview-file-icon" style={{ width: size, height: size }}>
        <FolderFilled fontSize={size} style={{ color: '#e5a93c' }} aria-hidden="true" />
      </span>
    )
  }

  const glyph = byExtension[extensionOf(name)] ?? { icon: DocumentFilled, color: '#9aa4b2' }
  const Glyph = glyph.icon
  return (
    <span className="preview-file-icon" style={{ width: size, height: size }}>
      <Glyph fontSize={size} style={{ color: glyph.color }} aria-hidden="true" />
    </span>
  )
}
