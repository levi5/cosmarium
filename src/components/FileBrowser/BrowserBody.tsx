import { Button } from '../base/Button'
import { DetailsPane } from '../DetailsPane'
import { SecondaryPane } from '../SecondaryPane'
import { PaneToolbar } from '../SecondaryPane/PaneToolbar'
import { FileTable } from './FileTable'
import { RecentsList } from './RecentsList'
import type { FileBrowserController } from './useFileBrowser'

function browserStatus(b: FileBrowserController) {
  if (b.busy)
    return (
      <div className="browser-message" role="status">
        {b.t('loading')}
      </div>
    )
  if (!b.failure) return null
  return (
    <div className="browser-message browser-message--error" role="alert">
      {b.t('error')}
      <small>{b.failure}</small>
      <Button
        onClick={() => {
          void b.workspace.refresh()
          b.setQuery('')
        }}
      >
        {b.t('refresh')}
      </Button>
    </div>
  )
}

function emptyLabel(b: FileBrowserController, compact: boolean) {
  if (compact) return b.t('noRecents')
  return b.t(b.search.hasQuery ? 'noResults' : 'empty')
}

export function BrowserBody({ browser: b, compact }: { browser: FileBrowserController; compact: boolean }) {
  const { t, preferences: p, workspace: w } = b
  const rows = b.visibleEntries.map((entry) => ({
    entry,
    tags: b.tagsOf(entry.path),
    isSelected: b.selected.includes(entry.path),
    isActive: b.activeEntry?.path === entry.path
  }))
  const status = browserStatus(b)
  const shared = {
    rows,
    view: b.view,
    iconSize: p.iconSize,
    language: p.language,
    activePath: b.activeEntry?.path ?? null,
    onSelect: b.select,
    onSelectPaths: b.setSelected,
    onFocusEntry: b.setActiveEntry,
    onOpen: b.open,
    onContextMenu: b.openMenu,
    onBackgroundMenu: b.openBackgroundMenu
  }
  const empty = <div className="browser-message">{emptyLabel(b, compact)}</div>
  if (compact) return status ?? (rows.length ? <RecentsList {...shared} /> : empty)
  return (
    <div className={b.split ? 'workspace-split' : 'browser-body'}>
      <div className={b.split ? 'workspace-pane' : 'browser-body'}>
        {b.split && (
          <PaneToolbar path={w.currentPath} language={p.language} onNavigate={w.navigateTo} onUp={() => void w.goUp()} onRefresh={() => void w.refresh()} />
        )}
        <div className="browser-body workspace-pane__content">
          {status ??
            (rows.length ? (
              <FileTable
                {...shared}
                currentPath={w.currentPath}
                selectedPaths={b.selected}
                onDrop={(paths, dest, cut) => void b.transfers.doDrop(paths, dest, cut)}
                labels={{
                  name: t('name'),
                  modified: t('modified'),
                  accessed: t('accessedField'),
                  type: t('type'),
                  size: t('size'),
                  file: t('file'),
                  fileType: t('fileType')
                }}
                folderLabel={t('folder')}
                showSize={p.showSize}
                folderSizes={b.folderSizes}
                onUnassign={(entry, tagId) => b.organizer.unassignTag(entry.path, tagId)}
              />
            ) : (
              empty
            ))}
          {b.detailsPane && (
            <DetailsPane
              entry={b.activeEntry}
              folderSizes={b.folderSizes}
              tags={b.activeEntry ? b.tagsOf(b.activeEntry.path) : []}
              language={p.language}
              folderLabel={t('folder')}
              fileLabel={t('file')}
              fileTypeLabel={t('fileType')}
              onUnassign={(entry, tagId) => b.organizer.unassignTag(entry.path, tagId)}
            />
          )}
        </div>
      </div>
      {b.split && (
        <SecondaryPane
          view={b.view}
          sortKey={b.sortKey}
          sortDirection={b.sortDirection}
          initialPath={w.currentPath}
          primaryPath={w.currentPath}
          primarySources={b.targetsFor().map((entry) => entry.path)}
          onChanged={() => void w.refresh()}
          onTransfer={b.transfers.doDrop}
        />
      )}
    </div>
  )
}
