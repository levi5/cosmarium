import { useState } from 'react'
import { type FileIconSize, ICON_PX } from '../../constants/view'
import { ROW_ANIMATION_MAX_INDEX, ROW_ANIMATION_STEP_MS, type ViewMode } from '../../constants/view'
import { useRowNavigation } from '../../hooks/useRowNavigation'
import { useVirtualList } from '../../hooks/useVirtualList'
import { getDragPayload, markDropTarget, setDragPayload } from '../../lib/dnd'
import { entryType, formatDate, sizeLabel } from '../../lib/format'
import type { Tag } from '../../lib/organizer'
import type { FileEntry } from '../../types/explorer'
import { Icon } from '../base/Icon'
import { FileIcon } from '../FileIcon'

export type FileRowModel = {
  entry: FileEntry
  tags: Tag[]
  isSelected: boolean
  isActive: boolean
}

type Props = {
  rows: FileRowModel[]
  view: ViewMode
  iconSize: FileIconSize
  language: string
  labels: { name: string; modified: string; accessed: string; type: string; size: string; file: string; fileType: string }
  folderLabel: string
  showSize: boolean
  folderSizes: Record<string, number>
  virtualize?: boolean
  currentPath: string
  selectedPaths: string[]
  activePath: string | null
  onDrop: (paths: string[], dest: string, cut: boolean) => void
  onSelect: (event: React.MouseEvent<HTMLElement>, entry: FileEntry) => void
  onSelectPaths: (paths: string[]) => void
  onFocusEntry: (entry: FileEntry) => void
  onOpen: (entry: FileEntry) => void
  onContextMenu: (event: React.MouseEvent<HTMLElement>, entry: FileEntry) => void
  onUnassign: (entry: FileEntry, tagId: string) => void
  onBackgroundMenu: (event: React.MouseEvent<HTMLElement>) => void
}

const ROW_HEIGHT = 42
const HEADER_HEIGHT = 36
const COMPACT_HEADER_HEIGHT = 26
const GRID_ROW_HEIGHT = 96
const VIRTUALIZE_THRESHOLD = 200
const COMPACT_PADDING = 12

function TagDots({ tags }: { tags: Tag[] }) {
  if (tags.length === 0) return null
  return (
    <span className="file-tagdots">
      {tags.map((tag) => (
        <i key={tag.id} title={`${tag.emoji} ${tag.name}`} style={{ background: tag.color }} />
      ))}
    </span>
  )
}

export function FileTable({
  rows,
  view,
  iconSize,
  language,
  labels,
  folderLabel,
  showSize,
  folderSizes,
  virtualize = true,
  currentPath,
  selectedPaths,
  activePath,
  onDrop,
  onSelect,
  onSelectPaths,
  onFocusEntry,
  onOpen,
  onContextMenu,
  onUnassign,
  onBackgroundMenu
}: Props) {
  const isGrid = view === 'grid'
  const isCompact = view === 'compact'
  const isDetails = view === 'details'
  const compactRowHeight = ICON_PX[iconSize] + COMPACT_PADDING
  const rowHeight = isCompact ? compactRowHeight : ROW_HEIGHT
  const headerHeight = isCompact ? COMPACT_HEADER_HEIGHT : HEADER_HEIGHT
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [draggingPath, setDraggingPath] = useState<string | null>(null)
  const canDropInto = draggingPath !== currentPath
  const useWindowing = virtualize && !isGrid && rows.length > VIRTUALIZE_THRESHOLD
  const {
    window: range,
    scrollRef,
    onScroll
  } = useVirtualList({
    count: rows.length,
    itemHeight: rowHeight,
    enabled: useWindowing
  })
  const visible = useWindowing ? rows.slice(range.start, range.start + range.count) : rows
  const paths = rows.map((row) => row.entry.path)
  const { tabIndexFor, onRowFocus, handleKeyDown } = useRowNavigation({
    paths,
    activePath,
    rowHeight: isGrid ? GRID_ROW_HEIGHT : rowHeight,
    headerHeight: isGrid ? 0 : headerHeight,
    scrollRef,
    onSelect: onSelectPaths,
    onActivate: (path) => {
      const row = rows.find((item) => item.entry.path === path)
      if (row) onFocusEntry(row.entry)
    }
  })

  return (
    <div
      ref={scrollRef}
      className={`file-table file-table--${view} ${showSize ? '' : 'file-table--no-size'} ${useWindowing ? 'file-table--windowed' : ''}`}
      style={isCompact ? ({ '--row-h': `${rowHeight}px` } as React.CSSProperties) : undefined}
      role="listbox"
      aria-multiselectable
      aria-label="Files"
      onScroll={onScroll}
      onKeyDown={handleKeyDown}
      onContextMenu={(event) => {
        if (event.target === event.currentTarget) onBackgroundMenu(event)
      }}
      onDragOver={(event) => {
        if (!canDropInto) return
        event.preventDefault()
        markDropTarget(event, true)
      }}
      onDrop={(event) => {
        const payload = getDragPayload(event)
        if (!payload) return
        event.preventDefault()
        setDragOver(null)
        onDrop(payload.paths, currentPath, !payload.copy)
      }}
    >
      {!isGrid && (
        <div className="file-table__header">
          <span>{labels.name}</span>
          {}
          {!isCompact && <span>{labels.modified}</span>}
          {isDetails && <span className="file-col-accessed">{labels.accessed}</span>}
          {!isCompact && <span>{labels.type}</span>}
          {!isCompact && showSize && <span>{labels.size}</span>}
        </div>
      )}
      {useWindowing && range.paddingTop > 0 && <div style={{ height: range.paddingTop }} aria-hidden="true" />}
      {visible.map((row, index) => {
        const rowIndex = range.start + index
        return (
          <div
            role="option"
            tabIndex={tabIndexFor(rowIndex)}
            data-row-index={rowIndex}
            aria-selected={row.isSelected}
            aria-setsize={rows.length}
            aria-posinset={rowIndex + 1}
            key={row.entry.path}
            draggable
            className={`file-row ${row.isSelected ? 'is-selected' : ''} ${row.isActive ? 'is-active' : ''} ${dragOver === row.entry.path ? 'is-drop-target' : ''}`}
            style={{ animationDelay: `${Math.min(index, ROW_ANIMATION_MAX_INDEX) * ROW_ANIMATION_STEP_MS}ms` }}
            onClick={(event) => onSelect(event, row.entry)}
            onDoubleClick={() => onOpen(row.entry)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                onOpen(row.entry)
              }
            }}
            onFocus={() => {
              onRowFocus(rowIndex)
              onFocusEntry(row.entry)
            }}
            onContextMenu={(event) => onContextMenu(event, row.entry)}
            onDragStart={(event) => {
              const dragged =
                event.shiftKey || event.ctrlKey || event.metaKey ? (selectedPaths.length > 0 ? selectedPaths : [row.entry.path]) : [row.entry.path]
              setDragPayload(event, dragged)
              setDraggingPath(row.entry.path)
            }}
            onDragEnd={() => setDraggingPath(null)}
            onDragOver={(event) => {
              if (row.entry.kind !== 'directory' || !canDropInto) return
              if (draggingPath === row.entry.path) return
              event.preventDefault()
              event.stopPropagation()
              markDropTarget(event, true)
              if (dragOver !== row.entry.path) setDragOver(row.entry.path)
            }}
            onDragLeave={() => {
              if (dragOver === row.entry.path) setDragOver(null)
            }}
            onDrop={(event) => {
              if (row.entry.kind !== 'directory' || !canDropInto) return
              const payload = getDragPayload(event)
              if (!payload) return
              if (payload.paths.includes(row.entry.path)) return
              event.preventDefault()
              event.stopPropagation()
              setDragOver(null)
              onDrop(payload.paths, row.entry.path, !payload.copy)
            }}
          >
            <div className="file-name">
              <FileIcon entry={row.entry} size={iconSize} />
              <span className="file-title">{row.entry.name}</span>
              {!isGrid &&
                !isCompact &&
                row.tags.map((tag) => (
                  <span key={tag.id} className="file-tag" style={{ '--tag-color': tag.color } as React.CSSProperties}>
                    {tag.emoji} {tag.name}
                    <button
                      type="button"
                      className="file-tag__remove"
                      aria-label={tag.name}
                      title={tag.name}
                      onClick={(event) => {
                        event.stopPropagation()
                        onUnassign(row.entry, tag.id)
                      }}
                    >
                      <Icon name="close" size={10} />
                    </button>
                  </span>
                ))}
            </div>
            {isGrid && <TagDots tags={row.tags} />}
            {!isCompact && <span className="file-meta">{formatDate(row.entry.modified, language)}</span>}
            {isDetails && !isCompact && <span className="file-meta file-meta--accessed">{formatDate(row.entry.accessed, language)}</span>}
            {!isCompact && <span className="file-meta">{entryType(row.entry, folderLabel, labels.file, labels.fileType)}</span>}
            {!isCompact && showSize && <span className="file-meta">{sizeLabel(row.entry, folderSizes, language)}</span>}
          </div>
        )
      })}
      {useWindowing && range.paddingBottom > 0 && <div style={{ height: range.paddingBottom }} aria-hidden="true" />}
    </div>
  )
}
