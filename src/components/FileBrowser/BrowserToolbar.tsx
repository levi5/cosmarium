import { Icon } from '../base/Icon'
import { IconButton } from '../base/IconButton'
import { FileTools } from '../FileTools'
import { toolMessages } from '../FileTools/messages'
import { SavedSearches } from '../SavedSearches'
import { ExplorerToolbar } from './ExplorerToolbar'
import type { FileBrowserController } from './useFileBrowser'

export function BrowserToolbar({ browser: b, compact }: { browser: FileBrowserController; compact: boolean }) {
  const { t, preferences: p, workspace: w, actions: a } = b
  if (compact)
    return (
      <div className="browser-heading browser-heading--compact">
        <div className="browser-recent-title">
          <Icon name="chevron" size={13} />
          <span>{t('recents')}</span>
        </div>
        <div className="browser-controls">
          <button
            type="button"
            className="browser-icon"
            onClick={b.recents.clear}
            disabled={!b.recents.entries.length}
            aria-label={t('clearRecents')}
            title={t('clearRecents')}
          >
            <Icon name="trash" size={15} />
          </button>
          <button
            type="button"
            className="browser-icon"
            onClick={() => {
              b.setRecentsToken((token) => token + 1)
              void w.refresh()
            }}
            aria-label={t('refresh')}
          >
            <Icon name="refresh" size={16} />
          </button>
          <div className="view-switch" role="toolbar" aria-label={t('view')}>
            {(['list', 'grid'] as const).map((mode) => (
              <IconButton
                key={mode}
                className={b.view === mode ? 'is-active' : ''}
                onClick={() => b.setView(mode)}
                label={t(mode)}
                icon={mode}
                aria-pressed={b.view === mode}
              />
            ))}
          </div>
        </div>
      </div>
    )
  return (
    <ExplorerToolbar
      tools={
        <>
          <FileTools
            entries={b.targetsFor()}
            path={w.currentPath}
            language={p.language}
            split={b.split}
            onSplit={() => b.setSplit(!b.split)}
            onChanged={() => void w.refresh()}
            onRenamed={(renamed) => {
              const originals = b.targetsFor()
              renamed.forEach((entry, index) => {
                b.organizer.moveTag(originals[index].path, entry.path)
                w.replaceEntry(originals[index].path, entry)
              })
              b.setSelected([])
              b.setActiveEntry(null)
              void w.refresh()
            }}
          />
          <SavedSearches
            query={b.query}
            root={w.currentPath}
            language={p.language}
            onSelect={(search) => {
              w.navigateTo(search.root)
              b.setQuery(search.query)
            }}
          />
        </>
      }
      view={b.view}
      iconSize={p.iconSize}
      showSize={p.showSize}
      canPaste={b.clipboard.paths.length > 0}
      canModify={(b.selected.length > 0 || Boolean(b.activeEntry)) && !a.deleting}
      sortKey={b.sortKey}
      sortDirection={b.sortDirection}
      query={b.query}
      searching={b.search.searching}
      searchInputRef={b.searchRef}
      labels={{
        view: t('view'),
        sort: t('sort'),
        byName: t('byName'),
        byModified: t('byModified'),
        byAccessed: t('byAccessed'),
        byType: t('byType'),
        bySize: t('bySize'),
        ascending: t('ascending'),
        descending: t('descending'),
        searchPlaceholder: t('searchPlaceholder'),
        searchHint: toolMessages(p.language).searchHelp,
        clearSearch: t('clearSearch'),
        iconSize: t('iconSize'),
        iconSmall: t('iconSmall'),
        iconMedium: t('iconMedium'),
        iconLarge: t('iconLarge'),
        showSize: t('showSize'),
        newFolder: t('newFolder'),
        cut: t('cut'),
        copy: t('copy'),
        paste: t('paste'),
        delete_: t('delete_'),
        emptyTrash: t('emptyTrash'),
        refresh: t('refresh'),
        list: t('list'),
        grid: t('grid'),
        details: t('details'),
        compact: t('compact')
      }}
      onToggleView={b.setView}
      onIconSize={p.setIconSize}
      onShowSize={p.setShowSize}
      onSort={b.setSortKey}
      onSortDirection={b.setSortDirection}
      onQuery={b.setQuery}
      onNewFolder={() => a.setFolderDialog({ open: true, error: null })}
      onCut={() => b.copy('cut')}
      onCopy={() => b.copy('copy')}
      onPaste={() => void b.transfers.doPaste(w.currentPath)}
      onDelete={() => b.requestDelete()}
      canEmptyTrash={b.isTrash && w.entries.length > 0}
      onEmptyTrash={() => a.setEmptyTrashOpen(true)}
      onRefresh={() => void w.refresh()}
    />
  )
}
