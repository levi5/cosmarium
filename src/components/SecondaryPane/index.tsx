import { listen } from '@tauri-apps/api/event'
import { _try } from 'funcio'
import { useEffect, useMemo, useState } from 'react'
import type { ViewMode } from '../../constants/view'
import { useFolderSizes } from '../../hooks/useFolderSizes'
import { errorMessage } from '../../lib/format'
import { createTranslator } from '../../lib/i18n'
import { useOrganizer } from '../../lib/organizer'
import { usePreferences } from '../../lib/preferences'
import { sortEntries } from '../../lib/search'
import { filesystem } from '../../services/tauri/filesystem'
import { useClipboardStore } from '../../stores/clipboardStore'
import type { FileEntry, SortDirection, SortKey, TransferProgress } from '../../types/explorer'
import { Icon } from '../base/Icon'
import { IconButton } from '../base/IconButton'
import { DetailsPane } from '../DetailsPane'
import { EntryDialogs } from '../EntryDialogs'
import { InspectionDialogs } from '../EntryDialogs/InspectionDialogs'
import { useEntryActions } from '../EntryDialogs/useEntryActions'
import { useInspection } from '../EntryDialogs/useInspection'
import { FileTable } from '../FileBrowser/FileTable'
import { toolMessages } from '../FileTools/messages'
import { PaneMenus } from './PaneMenus'
import { PaneToolbar } from './PaneToolbar'
import { useDirectoryPane } from './useDirectoryPane'
import { usePaneSelection } from './usePaneSelection'
import './styles.css'

type Props = {
  view?: ViewMode
  sortKey?: SortKey
  sortDirection?: SortDirection
  initialPath: string
  primaryPath: string
  primarySources: string[]
  onChanged: () => void
  onTransfer: (sources: string[], dest: string, cut: boolean) => Promise<void>
}

export function SecondaryPane({
  initialPath,
  primaryPath,
  primarySources,
  onChanged,
  onTransfer,
  view: primaryView = 'list',
  sortKey = 'name',
  sortDirection = 'asc'
}: Props) {
  const directory = useDirectoryPane(initialPath)
  const { path, navigate, entries, loading, error, watchError, refresh } = directory
  const { language, iconSize, showHidden, showSize, setShowHidden } = usePreferences()
  const organizer = useOrganizer()
  const [viewOverride, setView] = useState<ViewMode | null>(null)
  const view = viewOverride ?? primaryView
  const [detailsPane, setDetailsPane] = useState(false)
  const folderSizes = useFolderSizes(entries, showSize)
  const visibleEntries = useMemo(
    () =>
      sortEntries(
        entries.filter((entry) => showHidden || !entry.hidden),
        sortKey,
        sortDirection
      ),
    [entries, showHidden, sortKey, sortDirection]
  )
  const t = createTranslator(language)
  const labels = toolMessages(language)
  const { selected, setSelected, active, setActive } = usePaneSelection(visibleEntries)
  const actions = useEntryActions(directory, setSelected)
  const inspection = useInspection()
  const [menu, setMenu] = useState<{ entry: FileEntry; anchorX: number; anchorY: number } | null>(null)
  const [backgroundMenu, setBackgroundMenu] = useState<{ anchorX: number; anchorY: number } | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const clipboard = useClipboardStore()
  useEffect(() => {
    if (menu && !visibleEntries.some((entry) => entry.path === menu.entry.path)) setMenu(null)
  }, [menu, visibleEntries])
  useEffect(() => {
    let alive = true
    let unlisten: (() => void) | undefined
    listen<TransferProgress>('cosmarium://transfer-progress', ({ payload }) => {
      if (alive && payload.finished) void refresh()
    })
      .then((off) => {
        if (alive) unlisten = off
        else off()
      })
      .catch((reason) => {
        if (alive) setFailure(errorMessage(reason))
      })
    return () => {
      alive = false
      unlisten?.()
    }
  }, [refresh])
  const go = (next: string) => {
    navigate(next)
    setSelected([])
    setActive(null)
    setMenu(null)
    setBackgroundMenu(null)
    setFailure(null)
  }
  const open = (entry: FileEntry) => {
    if (entry.kind === 'directory') go(entry.path)
    else void filesystem.openWithDefault(entry.path).catch((reason) => setFailure(errorMessage(reason)))
  }
  const transfer = async (sources: string[], dest: string, cut: boolean) => {
    if (busy || !sources.length) return
    setBusy(true)
    setFailure(null)
    const result = await _try.async(async () => {
      await onTransfer(sources, dest, cut)
      setSelected([])
      await refresh()
      onChanged()
    })
    result.match({ right: () => {}, left: (reason) => setFailure(errorMessage(reason)) })
    setBusy(false)
  }
  const tagsOf = (entryPath: string) => organizer.tags.filter((tag) => organizer.taggedPaths[entryPath]?.includes(tag.id))
  const activeEntry = visibleEntries.find((entry) => entry.path === active) ?? null
  const targets = (entry?: FileEntry) =>
    entry && !selected.includes(entry.path)
      ? [entry]
      : visibleEntries.filter((item) => selected.includes(item.path) || (!selected.length && item.path === active))
  const copy = (mode: 'copy' | 'cut', entry?: FileEntry) => {
    const paths = targets(entry).map((item) => item.path)
    if (paths.length) clipboard.setClipboard(mode, paths)
  }
  const hasOverlay = actions.hasDialog || inspection.hasDialog || menu || backgroundMenu
  const transferActions = [
    { icon: 'copy', direction: 'arrow', label: labels.copyRight, sources: primarySources, dest: path, cut: false },
    { icon: 'cut', direction: 'arrow', label: labels.moveRight, sources: primarySources, dest: path, cut: true },
    { icon: 'copy', direction: 'back', label: labels.copyLeft, sources: selected, dest: primaryPath, cut: false },
    { icon: 'cut', direction: 'back', label: labels.moveLeft, sources: selected, dest: primaryPath, cut: true }
  ] as const
  return (
    <section
      className="secondary-pane"
      aria-label={labels.split}
      onKeyDown={(event) => {
        if ((menu || backgroundMenu) && ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Escape', 'Tab'].includes(event.key)) return
        event.stopPropagation()
        if (hasOverlay || (event.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')) return
        if (event.key === 'F2' && activeEntry) {
          event.preventDefault()
          actions.doRename(activeEntry)
        }
        if (event.key === 'Delete' && targets().length) {
          event.preventDefault()
          actions.setDeleteTargets(targets())
        }
        if (!(event.ctrlKey || event.metaKey)) return
        const key = event.key.toLowerCase()
        if (key === 'c' || key === 'x') {
          event.preventDefault()
          copy(key === 'c' ? 'copy' : 'cut')
        }
        if (key === 'v') {
          event.preventDefault()
          void transfer(clipboard.paths, path, clipboard.mode === 'cut')
        }
        if (key === 'a') {
          event.preventDefault()
          setSelected(visibleEntries.map((entry) => entry.path))
        }
      }}
    >
      <div className="pane-transfer-rail" role="toolbar" aria-label={labels.split} aria-orientation="vertical">
        {transferActions.map((action, index) => (
          <div key={action.label}>
            {index === 2 && <span className="pane-transfer-rail__divider" />}
            <IconButton
              icon={action.icon}
              label={action.label}
              className="pane-transfer-action"
              disabled={busy || !action.sources.length || path === primaryPath}
              onClick={() => void transfer([...action.sources], action.dest, action.cut)}
            >
              <span className="pane-transfer-action__direction">
                <Icon name={action.direction} size={10} />
              </span>
            </IconButton>
          </div>
        ))}
      </div>
      <div className="workspace-pane">
        <PaneToolbar
          path={path}
          language={language}
          onNavigate={go}
          onUp={() =>
            void filesystem
              .getParent(path)
              .then(go)
              .catch((reason) => setFailure(errorMessage(reason)))
          }
          onRefresh={() => void refresh()}
        />
        <section
          className="workspace-pane__content"
          aria-label={path}
          onContextMenu={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setMenu(null)
            setBackgroundMenu({ anchorX: event.clientX, anchorY: event.clientY })
          }}
        >
          {(error || failure) && <p role="alert">{error ?? failure}</p>}
          {watchError && (
            <p role="status">
              {watchError} — {t('refresh')}
            </p>
          )}
          {loading ? (
            <p role="status">{t('loading')}</p>
          ) : (
            <FileTable
              rows={visibleEntries.map((entry) => ({
                entry,
                tags: tagsOf(entry.path),
                isSelected: selected.includes(entry.path),
                isActive: active === entry.path
              }))}
              currentPath={path}
              selectedPaths={selected}
              activePath={active}
              view={view}
              iconSize={iconSize}
              language={language}
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
              showSize={showSize}
              folderSizes={folderSizes}
              onSelect={(event, entry) => {
                setActive(entry.path)
                setSelected(
                  event.ctrlKey || event.metaKey
                    ? selected.includes(entry.path)
                      ? selected.filter((item) => item !== entry.path)
                      : [...selected, entry.path]
                    : [entry.path]
                )
              }}
              onSelectPaths={setSelected}
              onFocusEntry={(entry) => setActive(entry.path)}
              onOpen={open}
              onContextMenu={(event, entry) => {
                event.preventDefault()
                event.stopPropagation()
                setActive(entry.path)
                setBackgroundMenu(null)
                setMenu({ entry, anchorX: event.clientX, anchorY: event.clientY })
              }}
              onBackgroundMenu={(event) => {
                event.preventDefault()
                event.stopPropagation()
                setMenu(null)
                setBackgroundMenu({ anchorX: event.clientX, anchorY: event.clientY })
              }}
              onUnassign={(entry, tagId) => organizer.unassignTag(entry.path, tagId)}
              onDrop={(sources, dest, cut) => void transfer(sources, dest, cut)}
            />
          )}
        </section>
        {detailsPane && (
          <DetailsPane
            entry={activeEntry}
            folderSizes={folderSizes}
            tags={activeEntry ? tagsOf(activeEntry.path) : []}
            language={language}
            folderLabel={t('folder')}
            fileLabel={t('file')}
            fileTypeLabel={t('fileType')}
            onUnassign={(entry, tagId) => organizer.unassignTag(entry.path, tagId)}
          />
        )}
      </div>
      <PaneMenus
        menu={menu}
        backgroundMenu={backgroundMenu}
        onClose={() => {
          setMenu(null)
          setBackgroundMenu(null)
        }}
        path={path}
        language={language}
        view={view}
        setView={setView}
        detailsPane={detailsPane}
        onToggleDetailsPane={() => setDetailsPane(!detailsPane)}
        showHidden={showHidden}
        onToggleHidden={() => setShowHidden(!showHidden)}
        actions={actions}
        inspection={inspection}
        onOpen={open}
        onCopy={copy}
        onDelete={(entry) => actions.setDeleteTargets(targets(entry))}
        onPaste={(dest) => void transfer(clipboard.paths, dest, clipboard.mode === 'cut')}
        canPaste={clipboard.paths.length > 0 && !busy}
        onRefresh={() => void refresh()}
        onError={(reason) => setFailure(errorMessage(reason))}
      />
      <EntryDialogs actions={actions} language={language} />
      <InspectionDialogs inspection={inspection} language={language} />
    </section>
  )
}
