import { useEffect } from 'react'
import type { ViewMode } from '../../constants/view'
import { useMenuPosition } from '../../hooks/useMenuPosition'
import { Icon } from '../base/Icon'
import './styles.css'
import { Portal } from '../base/Portal'

type Labels = {
  newFolder: string
  newFile: string
  paste: string
  refresh: string
  copyCurrentPath: string
  grid: string
  list: string
  details: string
  compact: string
  showHidden: string
  showDetailsPane: string
  emptyTrash?: string
}

type Props = {
  anchorX: number
  anchorY: number
  canPaste: boolean
  showHidden: boolean
  view: ViewMode
  detailsPane: boolean
  labels: Labels
  onNewFolder: () => void
  onNewFile: () => void
  onPaste: () => void
  onRefresh: () => void
  onCopyCurrentPath: () => void
  onGrid: () => void
  onList: () => void
  onDetails: () => void
  onCompact: () => void
  onToggleHidden: () => void
  onToggleDetailsPane: () => void
  onEmptyTrash?: () => void
  onClose: () => void
}

export function BackgroundContextMenu({
  anchorX,
  anchorY,
  canPaste,
  showHidden,
  view,
  detailsPane,
  labels,
  onNewFolder,
  onNewFile,
  onPaste,
  onRefresh,
  onCopyCurrentPath,
  onGrid,
  onList,
  onDetails,
  onCompact,
  onToggleHidden,
  onToggleDetailsPane,
  onEmptyTrash,
  onClose
}: Props) {
  const { ref, position } = useMenuPosition(anchorX, anchorY)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!(event.target as Element).closest('.background-context-menu')) onClose()
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
        className="background-context-menu"
        role="menu"
        style={{ left: position.left, top: position.top }}
        onContextMenu={(event) => event.preventDefault()}
      >
        <button type="button" onClick={run(onNewFolder)}>
          <Icon name="plus" size={14} />
          {labels.newFolder}
        </button>
        <button type="button" onClick={run(onNewFile)}>
          <Icon name="file" size={14} />
          {labels.newFile}
        </button>
        <button type="button" onClick={run(onPaste)} disabled={!canPaste}>
          <Icon name="paste" size={14} />
          {labels.paste}
        </button>
        <div className="background-context-menu__divider" />
        <button type="button" onClick={run(onRefresh)}>
          <Icon name="refresh" size={14} />
          {labels.refresh}
        </button>
        <button type="button" onClick={run(onCopyCurrentPath)}>
          <Icon name="file" size={14} />
          {labels.copyCurrentPath}
        </button>
        <button type="button" onClick={run(onToggleHidden)}>
          <Icon name="eye" size={14} />
          {labels.showHidden}
          {showHidden && (
            <span className="menu-check">
              <Icon name="check" size={12} />
            </span>
          )}
        </button>
        <div className="background-context-menu__divider" />
        {(
          [
            ['grid', onGrid, labels.grid],
            ['list', onList, labels.list],
            ['details', onDetails, labels.details],
            ['compact', onCompact, labels.compact]
          ] as const
        ).map(([mode, action, label]) => (
          <button type="button" key={mode} onClick={run(action)}>
            <Icon name={mode === 'grid' ? 'grid' : mode === 'list' ? 'list' : 'info'} size={14} />
            {label}
            {view === mode && (
              <span className="menu-check">
                <Icon name="check" size={12} />
              </span>
            )}
          </button>
        ))}
        {onEmptyTrash && (
          <>
            <div className="background-context-menu__divider" />
            <button type="button" className="is-danger" onClick={run(onEmptyTrash)}>
              <Icon name="broom" size={14} />
              {labels.emptyTrash}
            </button>
          </>
        )}
        <div className="background-context-menu__divider" />
        <button type="button" onClick={run(onToggleDetailsPane)}>
          <Icon name="info" size={14} />
          {labels.showDetailsPane}
          {detailsPane && (
            <span className="menu-check">
              <Icon name="check" size={12} />
            </span>
          )}
        </button>
      </div>
    </Portal>
  )
}
