import type { ReactNode, RefObject } from 'react'
import type { ViewMode } from '../../constants/view'
import type { IconSize } from '../../lib/preferences'
import type { SortDirection, SortKey } from '../../types/explorer'
import { IconButton } from '../base/IconButton'
import { SearchBox } from '../SearchBox'
import { SortMenu } from '../SortMenu'
import { ViewMenu } from '../ViewMenu'

type Props = {
  tools?: ReactNode
  view: ViewMode
  iconSize: IconSize
  showSize: boolean
  canPaste: boolean
  canModify: boolean
  sortKey: SortKey
  sortDirection: SortDirection
  query: string
  searching: boolean
  searchInputRef?: RefObject<HTMLInputElement>
  labels: Record<string, string>
  onToggleView: (view: ViewMode) => void
  onIconSize: (size: IconSize) => void
  onShowSize: (show: boolean) => void
  onSort: (key: SortKey) => void
  onSortDirection: (direction: SortDirection) => void
  onQuery: (query: string) => void
  onNewFolder: () => void
  onCut: () => void
  onCopy: () => void
  onPaste: () => void
  onDelete: () => void
  canEmptyTrash: boolean
  onEmptyTrash: () => void
  onRefresh: () => void
}

export function ExplorerToolbar({
  tools,
  view,
  iconSize,
  showSize,
  canPaste,
  canModify,
  sortKey,
  sortDirection,
  query,
  searching,
  searchInputRef,
  labels,
  onToggleView,
  onIconSize,
  onShowSize,
  onSort,
  onSortDirection,
  onQuery,
  onNewFolder,
  onCut,
  onCopy,
  onPaste,
  onDelete,
  canEmptyTrash,
  onEmptyTrash,
  onRefresh
}: Props) {
  return (
    <div className="explorer-toolbar">
      <ViewMenu
        iconSize={iconSize}
        showSize={showSize}
        labels={{
          view: labels.view,
          iconSize: labels.iconSize,
          iconSmall: labels.iconSmall,
          iconMedium: labels.iconMedium,
          iconLarge: labels.iconLarge,
          showSize: labels.showSize
        }}
        onIconSize={onIconSize}
        onShowSize={onShowSize}
      />
      <SortMenu
        sortKey={sortKey}
        sortDirection={sortDirection}
        labels={{
          sort: labels.sort,
          byName: labels.byName,
          byModified: labels.byModified,
          byAccessed: labels.byAccessed,
          byType: labels.byType,
          bySize: labels.bySize,
          ascending: labels.ascending,
          descending: labels.descending
        }}
        onSort={onSort}
        onDirection={onSortDirection}
      />
      <span className="explorer-toolbar__divider" />
      <IconButton icon="plus" label={labels.newFolder} onClick={onNewFolder} />
      <IconButton icon="cut" label={labels.cut} disabled={!canModify} onClick={onCut} />
      <IconButton icon="copy" label={labels.copy} disabled={!canModify} onClick={onCopy} />
      <IconButton icon="paste" label={labels.paste} disabled={!canPaste} onClick={onPaste} />
      <IconButton icon="trash" label={labels.delete_} disabled={!canModify} onClick={onDelete} />
      {canEmptyTrash && <IconButton icon="broom" label={labels.emptyTrash} className="explorer-toolbar__danger" onClick={onEmptyTrash} />}
      <IconButton icon="refresh" label={labels.refresh} onClick={onRefresh} />
      {tools}
      <span className="explorer-toolbar__spacer" />
      <SearchBox
        value={query}
        searching={searching}
        placeholder={labels.searchPlaceholder}
        clearLabel={labels.clearSearch}
        hint={labels.searchHint}
        inputRef={searchInputRef}
        onChange={onQuery}
      />
      <div className="view-switch" role="toolbar" aria-label="File view">
        {(
          [
            ['list', 'list'],
            ['grid', 'grid'],
            ['details', 'details'],
            ['compact', 'compact']
          ] as const
        ).map(([mode, label]) => (
          <IconButton
            key={mode}
            className={`view-switch__option ${view === mode ? 'is-active' : ''}`}
            onClick={() => onToggleView(mode)}
            label={labels[label] ?? label}
            icon={mode === 'grid' ? 'grid' : mode === 'compact' ? 'menu' : mode === 'details' ? 'details' : 'list'}
            aria-pressed={view === mode}
          />
        ))}
      </div>
    </div>
  )
}
