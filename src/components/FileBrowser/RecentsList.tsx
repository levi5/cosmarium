import { useRef } from 'react'
import type { FileIconSize } from '../../constants/view'
import type { ViewMode } from '../../constants/view'
import { useRowNavigation } from '../../hooks/useRowNavigation'
import { formatDate } from '../../lib/format'
import { recencyOf } from '../../lib/search'
import type { FileEntry } from '../../types/explorer'
import { FileIcon } from '../FileIcon'

export type RecentsRowModel = {
  entry: FileEntry
  isSelected: boolean
  isActive: boolean
}

type Props = {
  rows: RecentsRowModel[]
  view: ViewMode
  iconSize: FileIconSize
  language: string
  activePath: string | null
  onSelect: (event: React.MouseEvent<HTMLElement>, entry: FileEntry) => void
  onSelectPaths: (paths: string[]) => void
  onFocusEntry: (entry: FileEntry) => void
  onOpen: (entry: FileEntry) => void
  onContextMenu: (event: React.MouseEvent<HTMLElement>, entry: FileEntry) => void
  onBackgroundMenu: (event: React.MouseEvent<HTMLElement>) => void
}

const ROW_HEIGHT = 42
const GRID_ROW_HEIGHT = 96

export function RecentsList({
  rows,
  view,
  iconSize,
  language,
  activePath,
  onSelect,
  onSelectPaths,
  onFocusEntry,
  onOpen,
  onContextMenu,
  onBackgroundMenu
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isGrid = view === 'grid'
  const paths = rows.map((row) => row.entry.path)
  const { tabIndexFor, onRowFocus, handleKeyDown } = useRowNavigation({
    paths,
    activePath,
    rowHeight: isGrid ? GRID_ROW_HEIGHT : ROW_HEIGHT,
    headerHeight: 0,
    scrollRef,
    onSelect: onSelectPaths,
    onActivate: (path) => {
      const row = rows.find((item) => item.entry.path === path)
      if (row) onFocusEntry(row.entry)
    }
  })

  const rowEvents = (entry: FileEntry, index: number) => ({
    onClick: (event: React.MouseEvent<HTMLElement>) => onSelect(event, entry),
    onDoubleClick: () => onOpen(entry),
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        onOpen(entry)
      }
    },
    onFocus: () => {
      onRowFocus(index)
      onFocusEntry(entry)
    },
    onContextMenu: (event: React.MouseEvent<HTMLElement>) => onContextMenu(event, entry)
  })

  if (isGrid) {
    return (
      <div ref={scrollRef} className="file-table file-table--grid file-table--compact-grid" role="listbox" aria-multiselectable onKeyDown={handleKeyDown}>
        {rows.map((row, index) => (
          <div
            role="option"
            tabIndex={tabIndexFor(index)}
            data-row-index={index}
            aria-selected={row.isSelected}
            key={row.entry.path}
            className={`file-row ${row.isSelected ? 'is-selected' : ''} ${row.isActive ? 'is-active' : ''}`}
            {...rowEvents(row.entry, index)}
          >
            <div className="file-name">
              <FileIcon entry={row.entry} size={iconSize} />
              <span className="file-title">{row.entry.name}</span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className="recents-list"
      role="listbox"
      aria-multiselectable
      onKeyDown={handleKeyDown}
      onContextMenu={(event) => {
        if (event.target === event.currentTarget) onBackgroundMenu(event)
      }}
    >
      {rows.map((row, index) => (
        <div
          role="option"
          tabIndex={tabIndexFor(index)}
          data-row-index={index}
          aria-selected={row.isSelected}
          key={row.entry.path}
          className={`recents-row ${row.isSelected ? 'is-selected' : ''} ${row.isActive ? 'is-active' : ''}`}
          {...rowEvents(row.entry, index)}
        >
          <span className="recents-row__name">
            <FileIcon entry={row.entry} size={iconSize} />
            <span className="file-title">{row.entry.name}</span>
          </span>
          <span className="recents-row__date">{formatDate(recencyOf(row.entry), language)}</span>
          <span className="recents-row__path" title={row.entry.path}>
            {row.entry.path}
          </span>
        </div>
      ))}
    </div>
  )
}
