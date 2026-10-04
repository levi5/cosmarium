import type { RefObject } from 'react'
import type { ViewMode } from '../../constants/view'
import type { IconSize } from '../../lib/preferences'
import type { SortDirection, SortKey } from '../../types/explorer'
import { Icon } from '../base/Icon'
import { SearchBox } from '../SearchBox'
import { SortMenu } from '../SortMenu'
import { ViewMenu } from '../ViewMenu'

type Props = {
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
      <button type="button" className="explorer-toolbar__icon" aria-label={labels.newFolder} title={labels.newFolder} onClick={onNewFolder}>
        <Icon name="plus" size={16} />
      </button>
      <button type="button" className="explorer-toolbar__icon" aria-label={labels.cut} title={labels.cut} disabled={!canModify} onClick={onCut}>
        <Icon name="cut" size={16} />
      </button>
      <button type="button" className="explorer-toolbar__icon" aria-label={labels.copy} title={labels.copy} disabled={!canModify} onClick={onCopy}>
        <Icon name="copy" size={16} />
      </button>
      <button type="button" className="explorer-toolbar__icon" aria-label={labels.paste} title={labels.paste} disabled={!canPaste} onClick={onPaste}>
        <Icon name="paste" size={16} />
      </button>
      <button type="button" className="explorer-toolbar__icon" aria-label={labels.delete_} title={labels.delete_} disabled={!canModify} onClick={onDelete}>
        <Icon name="trash" size={16} />
      </button>
      {canEmptyTrash && (
        <button
          type="button"
          className="explorer-toolbar__icon explorer-toolbar__danger"
          aria-label={labels.emptyTrash}
          title={labels.emptyTrash}
          onClick={onEmptyTrash}
        >
          <Icon name="broom" size={16} />
        </button>
      )}
      <button type="button" className="explorer-toolbar__icon" onClick={onRefresh} aria-label={labels.refresh} title={labels.refresh}>
        <Icon name="refresh" size={16} />
      </button>
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
          <button
            key={mode}
            type="button"
            className={`view-switch__option ${view === mode ? 'is-active' : ''}`}
            onClick={() => onToggleView(mode)}
            aria-label={labels[label] ?? label}
            title={labels[label] ?? label}
            aria-pressed={view === mode}
          >
            <Icon name={mode === 'grid' ? 'grid' : mode === 'compact' ? 'menu' : mode === 'details' ? 'details' : 'list'} size={16} />
          </button>
        ))}
      </div>
    </div>
  )
}
