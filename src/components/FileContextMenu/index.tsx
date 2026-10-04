import { useEffect } from 'react'
import { useMenuPosition } from '../../hooks/useMenuPosition'
import type { FileEntry } from '../../lib/files'
import { Icon } from '../base/Icon'
import './styles.css'
import { Portal } from '../base/Portal'

type Labels = {
  open: string
  openInNewTab: string
  preview: string
  cut: string
  copy: string
  paste: string
  rename: string
  delete_: string
  copyPath: string
  quickAccess: string
  tag: string
  properties: string
}

type Props = {
  entry: FileEntry
  anchorX: number
  anchorY: number
  canPreview: boolean
  canPaste: boolean
  labels: Labels
  onOpen: () => void
  onOpenInNewTab: () => void
  onPreview: () => void
  onCut: () => void
  onCopy: () => void
  onPaste: () => void
  onRename: () => void
  onDelete: () => void
  onCopyPath: () => void
  onQuickAccess: () => void
  onTag: () => void
  onProperties: () => void
  onClose: () => void
}

export function FileContextMenu({
  entry,
  anchorX,
  anchorY,
  canPreview,
  canPaste,
  labels,
  onOpen,
  onOpenInNewTab,
  onPreview,
  onCut,
  onCopy,
  onPaste,
  onRename,
  onDelete,
  onCopyPath,
  onQuickAccess,
  onTag,
  onProperties,
  onClose
}: Props) {
  const { ref, position } = useMenuPosition(anchorX, anchorY)
  const isDirectory = entry.kind === 'directory'

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!(event.target as Element).closest('.file-context-menu')) onClose()
    }
    const onScroll = () => onClose()
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('mousedown', onPointerDown, true)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('mousedown', onPointerDown, true)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [onClose])

  const run = (fn: () => void) => (event: React.MouseEvent) => {
    event.stopPropagation()
    fn()
  }

  return (
    <Portal>
      <div
        ref={ref}
        className="file-context-menu"
        role="menu"
        style={{ left: position.left, top: position.top }}
        onContextMenu={(event) => event.preventDefault()}
      >
        <div className="file-context-menu__actions">
          <button type="button" onClick={run(onOpen)} aria-label={labels.open} title={labels.open}>
            <Icon name="arrow" size={14} />
          </button>
          {isDirectory && (
            <button type="button" onClick={run(onOpenInNewTab)} aria-label={labels.openInNewTab} title={labels.openInNewTab}>
              <Icon name="plus" size={14} />
            </button>
          )}
          {canPreview && (
            <button type="button" onClick={run(onPreview)} aria-label={labels.preview} title={labels.preview}>
              <Icon name="eye" size={14} />
            </button>
          )}
          <button type="button" onClick={run(onCopyPath)} aria-label={labels.copyPath} title={labels.copyPath}>
            <Icon name="file" size={14} />
          </button>
        </div>
        <button type="button" className="file-context-menu__main" onClick={run(onOpen)}>
          <Icon name="arrow" size={14} />
          {labels.open}
        </button>
        {isDirectory && (
          <button type="button" onClick={run(onOpenInNewTab)}>
            <Icon name="plus" size={14} />
            {labels.openInNewTab}
          </button>
        )}
        {canPreview && (
          <button type="button" onClick={run(onPreview)}>
            <Icon name="eye" size={14} />
            {labels.preview}
          </button>
        )}
        <div className="file-context-menu__divider" />
        <button type="button" onClick={run(onCut)}>
          <Icon name="cut" size={14} />
          {labels.cut}
        </button>
        <button type="button" onClick={run(onCopy)}>
          <Icon name="copy" size={14} />
          {labels.copy}
        </button>
        {isDirectory && (
          <button type="button" onClick={run(onPaste)} disabled={!canPaste}>
            <Icon name="paste" size={14} />
            {labels.paste}
          </button>
        )}
        <button type="button" onClick={run(onRename)}>
          <Icon name="rename" size={14} />
          {labels.rename}
        </button>
        <button type="button" className="is-danger" onClick={run(onDelete)}>
          <Icon name="trash" size={14} />
          {labels.delete_}
        </button>
        <div className="file-context-menu__divider" />
        <button type="button" onClick={run(onCopyPath)}>
          <Icon name="file" size={14} />
          {labels.copyPath}
        </button>
        <div className="file-context-menu__divider" />
        {isDirectory && (
          <button type="button" onClick={run(onQuickAccess)}>
            <Icon name="pin" size={14} />
            {labels.quickAccess}
          </button>
        )}
        <button type="button" onClick={run(onTag)}>
          <Icon name="tag" size={14} />
          {labels.tag}
        </button>
        <div className="file-context-menu__divider" />
        <button type="button" onClick={run(onProperties)}>
          <Icon name="info" size={14} />
          {labels.properties}
        </button>
      </div>
    </Portal>
  )
}
