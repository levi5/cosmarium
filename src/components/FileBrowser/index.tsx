import { type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FileIconSize } from '../../constants/view'
import { STORAGE } from '../../constants/storage'
import { DEFAULT_VIEW, type ViewMode } from '../../constants/view'
import { useFolderSizes } from '../../hooks/useFolderSizes'
import { useRecentEntries } from '../../hooks/useRecentEntries'
import { useShortcuts } from '../../hooks/useShortcuts'
import { type FileEntry, useFileWorkspace } from '../../lib/files'
import { copyText, errorMessage, joinPath, lastSegment, previewType } from '../../lib/format'
import { createTranslator } from '../../lib/i18n'
import { type Tag, useOrganizer } from '../../lib/organizer'
import { usePreferences } from '../../lib/preferences'
import { filterEntries, parseQuery, sortByRecency, sortEntries } from '../../lib/search'
import { isActivatableTarget } from '../../lib/shortcuts'
import { filesystem } from '../../services/tauri/filesystem'
import { useClipboardStore } from '../../stores/clipboardStore'
import { useExplorerStore } from '../../stores/explorerStore'
import { usePendingDropStore } from '../../stores/pendingDropStore'
import { useRecentStore } from '../../stores/recentStore'
import { useSelectionStore } from '../../stores/selectionStore'
import type { ConflictResolution, SortDirection, SortKey, TransferScan } from '../../types/explorer'
import { BackgroundContextMenu } from '../BackgroundContextMenu'
import { Icon } from '../base/Icon'
import { ConfirmDialog } from '../ConfirmDialog'
import { ConflictDialog } from '../ConflictDialog'
import { DetailsPane } from '../DetailsPane'
import { FileContextMenu } from '../FileContextMenu'
import { PreviewPane } from '../PreviewPane'
import { PromptDialog } from '../PromptDialog'
import { PropertiesDialog } from '../PropertiesDialog'
import { TagDialog } from '../TagDialog'
import { TrashView } from '../TrashView'
import { ExplorerToolbar } from './ExplorerToolbar'
import { type FileRowModel, FileTable } from './FileTable'
import { RecentsList, type RecentsRowModel } from './RecentsList'
import '../FileIcon/styles.css'
import './styles.css'

type Anchor = { anchorX: number; anchorY: number }
type MenuState = Anchor & { entry: FileEntry }
type BackgroundMenuState = Anchor
type ConflictState = { sources: string[]; dest: string; cut: boolean; scan: TransferScan }
type FormState = { open: boolean; error: string | null }

const closedForm: FormState = { open: false, error: null }
const NO_ROOTS: string[] = []
const RECENTS_LIMIT = 40

function newTransferId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}

function togglePath(paths: string[], path: string): string[] {
  return paths.includes(path) ? paths.filter((item) => item !== path) : [...paths, path]
}

export function FileBrowser({ compact = false }: { compact?: boolean }) {
  const { language, showSize, iconSize, showHidden, setIconSize, setShowSize, setShowHidden } = usePreferences()
  const { entries, currentPath, loading, error, navigateTo, refresh, createFolder, createFile, removeEntries, replaceEntry, locations } = useFileWorkspace()
  const { tags, taggedPaths, createTag, assignTag, unassignTag, moveTag, removeTag, addQuickAccess } = useOrganizer()
  const { selected, setSelected } = useSelectionStore()
  const recordRecent = useRecentStore((state) => state.record)
  const { createTab } = useExplorerStore()
  const { mode: clipMode, paths: clipPaths, setClipboard, clear: clearClipboard } = useClipboardStore()
  const recordCreated = useCallback((paths: string[]) => filesystem.recordCreated(paths), [])
  const translateText = useMemo(() => createTranslator(language), [language])

  const [view, setView] = useState<ViewMode>(() => (localStorage.getItem(STORAGE.fileView) as ViewMode) || DEFAULT_VIEW)
  const [sortKey, setSortKey] = useState<SortKey>(() => (localStorage.getItem(STORAGE.sortKey) as SortKey) || 'name')
  const [sortDirection, setSortDirection] = useState<SortDirection>(() => (localStorage.getItem(STORAGE.sortDirection) as SortDirection) || 'asc')
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FileEntry[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [detailsPane, setDetailsPane] = useState<boolean>(() => localStorage.getItem(STORAGE.detailsPane) === 'true')
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [backgroundMenu, setBackgroundMenu] = useState<BackgroundMenuState | null>(null)
  const [activeEntry, setActiveEntry] = useState<FileEntry | null>(null)
  const [preview, setPreview] = useState<FileEntry | null>(null)
  const [propertiesTarget, setPropertiesTarget] = useState<FileEntry | null>(null)
  const [tagTarget, setTagTarget] = useState<FileEntry | null>(null)
  const [deleteTagId, setDeleteTagId] = useState<string | null>(null)
  const [renameTarget, setRenameTarget] = useState<FileEntry | null>(null)
  const [renameError, setRenameError] = useState<string | null>(null)
  const [deleteTargets, setDeleteTargets] = useState<FileEntry[] | null>(null)
  const [emptyTrashOpen, setEmptyTrashOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [folderDialog, setFolderDialog] = useState<FormState>(closedForm)
  const [fileDialog, setFileDialog] = useState<FormState>(closedForm)
  const [conflictState, setConflictState] = useState<ConflictState | null>(null)
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null)
  const [recentsToken, setRecentsToken] = useState(0)

  const recentRoots = useMemo(() => {
    if (!locations) return NO_ROOTS
    const { home, desktop, downloads, documents, pictures, music, videos } = locations
    return [...new Set([home, desktop, downloads, documents, pictures, music, videos])]
  }, [locations])
  const recents = useRecentEntries({ enabled: compact, roots: recentRoots, limit: RECENTS_LIMIT, includeHidden: showHidden, reloadToken: recentsToken })

  const folderSizes = useFolderSizes(entries, showSize)
  const searchRef = useRef<HTMLInputElement>(null)
  const previewKind = preview ? previewType(preview) : null
  const hasOverlay = Boolean(
    deleting ||
      renameTarget ||
      deleteTargets ||
      emptyTrashOpen ||
      conflictState ||
      folderDialog.open ||
      fileDialog.open ||
      tagTarget ||
      preview ||
      notice ||
      menu ||
      backgroundMenu
  )

  const tagsOf = useCallback(
    (path: string): Tag[] => (taggedPaths[path] || []).map((id) => tags.find((tag) => tag.id === id)).filter((tag): tag is Tag => Boolean(tag)),
    [taggedPaths, tags]
  )

  useEffect(() => {
    localStorage.setItem(STORAGE.fileView, view)
  }, [view])
  useEffect(() => {
    localStorage.setItem(STORAGE.sortKey, sortKey)
  }, [sortKey])
  useEffect(() => {
    localStorage.setItem(STORAGE.sortDirection, sortDirection)
  }, [sortDirection])
  useEffect(() => {
    localStorage.setItem(STORAGE.detailsPane, String(detailsPane))
  }, [detailsPane])
  const selectEntry = (event: MouseEvent<HTMLElement>, entry: FileEntry) => {
    setActiveEntry(entry)
    const isMultiSelect = event.ctrlKey || event.metaKey
    setSelected(isMultiSelect ? togglePath(selected, entry.path) : [entry.path])
  }

  const focusEntry = (entry: FileEntry) => {
    setActiveEntry(entry)
  }

  const selectPaths = useCallback((paths: string[]) => setSelected(paths), [setSelected])

  const remember = (entry: FileEntry) => {
    recordRecent({ path: entry.path, name: entry.name, kind: entry.kind })
  }

  const openInSystem = async (entry: FileEntry) => {
    remember(entry)
    try {
      await filesystem.openWithDefault(entry.path)
    } catch (reason) {
      setNotice({ title: translateText('openSystem'), message: errorMessage(reason) })
    }
  }

  const openEntry = (entry: FileEntry) => {
    if (entry.kind !== 'directory') {
      void openInSystem(entry)
      return
    }
    remember(entry)
    navigateTo(entry.path)
  }

  const previewEntry = (entry: FileEntry) => {
    if (previewType(entry)) setPreview(entry)
  }

  const openMenu = (event: MouseEvent<HTMLElement>, entry: FileEntry) => {
    event.preventDefault()
    event.stopPropagation()
    setBackgroundMenu(null)
    setMenu({ entry, anchorX: event.clientX, anchorY: event.clientY })
  }

  const openBackgroundMenu = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setMenu(null)
    setBackgroundMenu({ anchorX: event.clientX, anchorY: event.clientY })
  }

  const targetsFor = (entry?: FileEntry): FileEntry[] => {
    if (entry) {
      return selected.includes(entry.path) ? entries.filter((item) => selected.includes(item.path)) : [entry]
    }
    if (selected.length > 0) return entries.filter((item) => selected.includes(item.path))
    return activeEntry ? [activeEntry] : []
  }

  const doCopy = (entry?: FileEntry) => {
    const targets = targetsFor(entry)
    if (targets.length > 0)
      setClipboard(
        'copy',
        targets.map((item) => item.path)
      )
  }

  const doCut = (entry?: FileEntry) => {
    const targets = targetsFor(entry)
    if (targets.length > 0)
      setClipboard(
        'cut',
        targets.map((item) => item.path)
      )
  }

  const runTransfer = useCallback(
    async (sources: string[], dest: string, cut: boolean, resolutions: ConflictResolution[]) => {
      const id = newTransferId()
      try {
        await filesystem.transferEntries(id, sources, dest, cut, resolutions)
        for (const source of sources) moveTag(source, joinPath(dest, lastSegment(source, '')))
        if (cut) removeEntries(sources)
      } catch {
        void refresh()
        return
      } finally {
        if (cut) clearClipboard()
        setSelected([])
      }
      if (dest === currentPath) void refresh()
    },
    [clearClipboard, currentPath, moveTag, refresh, setSelected, removeEntries]
  )

  const doPaste = useCallback(
    async (dest: string) => {
      if (clipPaths.length === 0 || !dest) return
      const cut = clipMode === 'cut'
      const sources = [...clipPaths]
      try {
        const scan = await filesystem.scanTransfer(sources, dest)
        if (scan.conflicts.length > 0) {
          setConflictState({ sources, dest, cut, scan })
          return
        }
        await runTransfer(sources, dest, cut, [])
      } catch (reason) {
        setNotice({ title: cut ? translateText('moving') : translateText('copying'), message: errorMessage(reason) })
      }
    },
    [clipMode, clipPaths, runTransfer, translateText]
  )

  const doDrop = useCallback(
    async (paths: string[], dest: string, cut: boolean) => {
      if (paths.length === 0 || !dest) return
      if (paths.some((path) => path === dest)) return
      const sources = [...paths]
      setSelected([])
      try {
        const scan = await filesystem.scanTransfer(sources, dest)
        if (scan.conflicts.length > 0) {
          setConflictState({ sources, dest, cut, scan })
          return
        }
        await runTransfer(sources, dest, cut, [])
      } catch (reason) {
        setNotice({ title: cut ? translateText('moving') : translateText('copying'), message: errorMessage(reason) })
      }
    },
    [runTransfer, setSelected, translateText]
  )

  const pendingDrop = usePendingDropStore((state) => state.drop)
  const clearPendingDrop = usePendingDropStore((state) => state.clear)
  const paths = pendingDrop?.paths
  const dest = pendingDrop?.dest
  const cut = pendingDrop?.cut
  useEffect(() => {
    if (!paths || !dest) return
    clearPendingDrop()
    void doDrop(paths, dest, cut === true)
  }, [clearPendingDrop, cut, dest, doDrop, paths])

  const doRename = (entry: FileEntry) => {
    setRenameError(null)
    setRenameTarget(entry)
  }

  const handleRename = async (name: string) => {
    if (!renameTarget) return
    const previousPath = renameTarget.path
    try {
      const entry = await filesystem.renameEntry(previousPath, name)
      moveTag(previousPath, entry.path)
      replaceEntry(previousPath, entry)
      setRenameTarget(null)
      setRenameError(null)
      void filesystem.recordRename(previousPath, entry.path)
    } catch (reason) {
      setRenameError(errorMessage(reason))
    }
  }

  const handleDelete = async () => {
    if (!deleteTargets) return
    const paths = deleteTargets.map((item) => item.path)
    setDeleteTargets(null)
    setDeleting(true)
    try {
      await filesystem.trashEntries(paths, newTransferId())
      removeEntries(paths)
    } catch (reason) {
      setNotice({ title: translateText('deleteTitle'), message: errorMessage(reason) })
      void refresh()
    } finally {
      setDeleting(false)
      setSelected([])
      if (clipMode === 'cut') clearClipboard()
    }
  }

  const handleEmptyTrash = async () => {
    setEmptyTrashOpen(false)
    try {
      await filesystem.emptyTrash()
      setSelected([])
      void refresh()
    } catch (reason) {
      setNotice({ title: translateText('emptyTrashTitle'), message: errorMessage(reason) })
      void refresh()
    }
  }

  const handleCreateFolder = async (name: string) => {
    try {
      await createFolder(name)
      setFolderDialog(closedForm)
      void recordCreated([joinPath(currentPath, name)])
    } catch (reason) {
      setFolderDialog({ open: true, error: errorMessage(reason) })
    }
  }

  const handleCreateFile = async (name: string) => {
    try {
      await createFile(name)
      setFileDialog(closedForm)
      void recordCreated([joinPath(currentPath, name)])
    } catch (reason) {
      setFileDialog({ open: true, error: errorMessage(reason) })
    }
  }

  const parsedQuery = useMemo(() => parseQuery(query, showHidden), [query, showHidden])
  const hasQuery = query.trim().length > 0
  const isTrash = Boolean(locations?.trash && locations.trash !== locations.home && currentPath === locations.trash)

  const useRecursive = hasQuery && (parsedQuery.text.includes(' ') || parsedQuery.maxDepth !== 8 || parsedQuery.minSize > 0)

  useEffect(() => {
    if (!useRecursive || !currentPath) {
      setSearchResults(null)
      setSearching(false)
      return
    }
    let cancelled = false
    setSearching(true)
    const timer = window.setTimeout(() => {
      filesystem
        .searchEntries({
          text: parsedQuery.text,
          root: currentPath,
          extensions: parsedQuery.extensions,
          maxDepth: parsedQuery.maxDepth,
          minSize: parsedQuery.minSize,
          limit: 5000,
          includeHidden: parsedQuery.includeHidden
        })
        .then((results) => {
          if (!cancelled) setSearchResults(results)
        })
        .catch(() => {
          if (!cancelled) setSearchResults(null)
        })
        .finally(() => {
          if (!cancelled) setSearching(false)
        })
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [useRecursive, parsedQuery, currentPath])

  const visibleEntries = useMemo(() => {
    if (compact) return sortByRecency(recents.entries)
    return sortEntries(filterEntries(searchResults ?? entries, parsedQuery), sortKey, sortDirection)
  }, [compact, recents.entries, entries, searchResults, parsedQuery, sortKey, sortDirection])

  useShortcuts({
    enabled: !hasOverlay,
    hasTargets: selected.length > 0 || Boolean(activeEntry),
    handlers: {
      focusSearch: () => {
        searchRef.current?.focus()
        searchRef.current?.select()
      },
      toggleHidden: () => setShowHidden(!showHidden),
      toggleDetailsPane: () => setDetailsPane(!detailsPane),
      cycleView: () => setView((current) => (current === 'grid' ? 'list' : 'grid')),
      copy: () => doCopy(),
      cut: () => doCut(),
      paste: () => {
        void doPaste(currentPath)
      },
      selectAll: () => setSelected(visibleEntries.map((item) => item.path)),
      delete: () => {
        const targets = targetsFor()
        if (targets.length > 0) setDeleteTargets(targets)
      },
      rename: () => {
        const single = activeEntry ?? entries.find((item) => selected.includes(item.path))
        if (single) doRename(single)
      },
      open: (event) => {
        if (!activeEntry) return
        if ((event.target as HTMLElement | null)?.closest('[role="option"]')) return
        openEntry(activeEntry)
      },
      preview: (event) => {
        if (!activeEntry) return
        if (isActivatableTarget(event.target)) return
        previewEntry(activeEntry)
      },
      properties: () => {
        const target = activeEntry ?? entries.find((item) => selected.includes(item.path))
        if (target) setPropertiesTarget(target)
      },
      newFolder: () => setFolderDialog({ open: true, error: null }),
      newFile: () => setFileDialog({ open: true, error: null })
    }
  })

  const tableRows: FileRowModel[] = visibleEntries.map((entry) => ({
    entry,
    tags: tagsOf(entry.path),
    isSelected: selected.includes(entry.path),
    isActive: activeEntry?.path === entry.path
  }))

  const recentsRows: RecentsRowModel[] = visibleEntries.map((entry) => ({
    entry,
    isSelected: selected.includes(entry.path),
    isActive: activeEntry?.path === entry.path
  }))

  const isGrid = view === 'grid'
  const tableIconSize: FileIconSize = iconSize
  const busy = compact ? recents.loading : loading
  const failure = compact ? null : error

  if (isTrash && !compact) {
    return (
      <section className="file-browser">
        <TrashView
          onChanged={() => void refresh()}
          labels={{
            name: translateText('name'),
            origin: translateText('trashOrigin'),
            deletedAt: translateText('trashDeletedAt'),
            restore: translateText('restore'),
            restoreTitle: translateText('restoreTitle'),
            restoreMessage: translateText('restoreMessage'),
            emptyTrash: translateText('emptyTrash'),
            emptyTrashTitle: translateText('emptyTrashTitle'),
            emptyTrashMessage: translateText('emptyTrashMessage'),
            trashEmpty: translateText('trashEmpty'),
            ok: translateText('ok'),
            cancel: translateText('cancel'),
            loading: translateText('loading')
          }}
        />
      </section>
    )
  }

  return (
    <section className={`file-browser ${compact ? 'file-browser--compact' : ''}`}>
      {compact ? (
        <div className="browser-heading browser-heading--compact">
          <div className="browser-recent-title">
            <Icon name="chevron" size={13} />
            <span>{translateText('recents')}</span>
          </div>
          <div className="browser-controls">
            <button
              type="button"
              className="browser-icon"
              onClick={recents.clear}
              disabled={recents.entries.length === 0}
              aria-label={translateText('clearRecents')}
              title={translateText('clearRecents')}
            >
              <Icon name="trash" size={15} />
            </button>
            <button
              type="button"
              className="browser-icon"
              onClick={() => {
                setRecentsToken((token) => token + 1)
                void refresh()
              }}
              aria-label={translateText('refresh')}
            >
              <Icon name="refresh" size={16} />
            </button>
            <div className="view-switch" role="toolbar" aria-label="File view">
              <button type="button" className={!isGrid ? 'is-active' : ''} onClick={() => setView('list')} aria-label="List view">
                <Icon name="list" size={16} />
              </button>
              <button type="button" className={isGrid ? 'is-active' : ''} onClick={() => setView('grid')} aria-label="Grid view">
                <Icon name="grid" size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <ExplorerToolbar
          view={view}
          iconSize={iconSize}
          showSize={showSize}
          canPaste={clipPaths.length > 0}
          canModify={(selected.length > 0 || Boolean(activeEntry)) && !deleting}
          sortKey={sortKey}
          sortDirection={sortDirection}
          query={query}
          searching={searching}
          searchInputRef={searchRef}
          labels={{
            view: translateText('view'),
            sort: translateText('sort'),
            byName: translateText('byName'),
            byModified: translateText('byModified'),
            byAccessed: translateText('byAccessed'),
            byType: translateText('byType'),
            bySize: translateText('bySize'),
            ascending: translateText('ascending'),
            descending: translateText('descending'),
            searchPlaceholder: translateText('searchPlaceholder'),
            searchHint: translateText('searchHint'),
            clearSearch: translateText('clearSearch'),
            iconSize: translateText('iconSize'),
            iconSmall: translateText('iconSmall'),
            iconMedium: translateText('iconMedium'),
            iconLarge: translateText('iconLarge'),
            showSize: translateText('showSize'),
            newFolder: translateText('newFolder'),
            cut: translateText('cut'),
            copy: translateText('copy'),
            paste: translateText('paste'),
            delete_: translateText('delete_'),
            emptyTrash: translateText('emptyTrash'),
            refresh: translateText('refresh')
          }}
          onToggleView={setView}
          onIconSize={setIconSize}
          onShowSize={setShowSize}
          onSort={setSortKey}
          onSortDirection={setSortDirection}
          onQuery={setQuery}
          onNewFolder={() => setFolderDialog({ open: true, error: null })}
          onCut={() => doCut()}
          onCopy={() => doCopy()}
          onPaste={() => {
            void doPaste(currentPath)
          }}
          onDelete={() => {
            const targets = targetsFor()
            if (targets.length > 0) setDeleteTargets(targets)
          }}
          canEmptyTrash={isTrash && entries.length > 0}
          onEmptyTrash={() => setEmptyTrashOpen(true)}
          onRefresh={() => {
            void refresh()
          }}
        />
      )}

      {busy ? (
        <div className="browser-message">{translateText('loading')}</div>
      ) : failure ? (
        <div className="browser-message browser-message--error">
          {translateText('error')}
          <small>{failure}</small>
        </div>
      ) : visibleEntries.length === 0 ? (
        <div className="browser-message">{compact ? translateText('noRecents') : hasQuery ? translateText('noResults') : translateText('empty')}</div>
      ) : compact ? (
        <RecentsList
          rows={recentsRows}
          view={view}
          iconSize={iconSize}
          language={language}
          activePath={activeEntry?.path ?? null}
          onSelect={selectEntry}
          onSelectPaths={selectPaths}
          onFocusEntry={focusEntry}
          onOpen={openEntry}
          onContextMenu={(event, entry) => {
            setActiveEntry(entry)
            openMenu(event, entry)
          }}
          onBackgroundMenu={openBackgroundMenu}
        />
      ) : (
        <div className="browser-body">
          <FileTable
            rows={tableRows}
            currentPath={currentPath}
            selectedPaths={selected}
            activePath={activeEntry?.path ?? null}
            onDrop={(paths, dest, cut) => {
              void doDrop(paths, dest, cut)
            }}
            view={view}
            iconSize={tableIconSize}
            language={language}
            labels={{
              name: translateText('name'),
              modified: translateText('modified'),
              accessed: translateText('accessedField'),
              type: translateText('type'),
              size: translateText('size'),
              file: translateText('file'),
              fileType: translateText('fileType')
            }}
            folderLabel={translateText('folder')}
            showSize={showSize}
            folderSizes={folderSizes}
            onSelect={selectEntry}
            onSelectPaths={selectPaths}
            onFocusEntry={focusEntry}
            onOpen={openEntry}
            onContextMenu={(event, entry) => {
              setActiveEntry(entry)
              openMenu(event, entry)
            }}
            onUnassign={(entry, tagId) => unassignTag(entry.path, tagId)}
            onBackgroundMenu={openBackgroundMenu}
          />
          {detailsPane && (
            <DetailsPane
              entry={activeEntry}
              folderSizes={folderSizes}
              tags={activeEntry ? tagsOf(activeEntry.path) : []}
              language={language}
              folderLabel={translateText('folder')}
              fileLabel={translateText('file')}
              fileTypeLabel={translateText('fileType')}
              onUnassign={(entry, tagId) => unassignTag(entry.path, tagId)}
            />
          )}
        </div>
      )}

      {menu && (
        <FileContextMenu
          entry={menu.entry}
          anchorX={menu.anchorX}
          anchorY={menu.anchorY}
          canPreview={Boolean(previewType(menu.entry))}
          canPaste={clipPaths.length > 0}
          labels={{
            open: translateText('open'),
            openInNewTab: translateText('openInNewTab'),
            preview: translateText('preview'),
            cut: translateText('cut'),
            copy: translateText('copy'),
            paste: translateText('paste'),
            rename: translateText('rename'),
            delete_: translateText('delete_'),
            copyPath: translateText('copyPath'),
            quickAccess: translateText('addQuickAccess'),
            tag: translateText('addTag'),
            properties: translateText('properties')
          }}
          onOpen={() => {
            openEntry(menu.entry)
            setMenu(null)
          }}
          onOpenInNewTab={() => {
            if (menu.entry.kind === 'directory') createTab(menu.entry.path)
            setMenu(null)
          }}
          onPreview={() => {
            setPreview(menu.entry)
            setMenu(null)
          }}
          onCut={() => {
            doCut(menu.entry)
            setMenu(null)
          }}
          onCopy={() => {
            doCopy(menu.entry)
            setMenu(null)
          }}
          onPaste={() => {
            setMenu(null)
            void doPaste(menu.entry.path)
          }}
          onRename={() => {
            doRename(menu.entry)
            setMenu(null)
          }}
          onDelete={() => {
            const targets = targetsFor(menu.entry)
            if (targets.length > 0) setDeleteTargets(targets)
            setMenu(null)
          }}
          onCopyPath={() => {
            void copyText(menu.entry.path)
            setMenu(null)
          }}
          onTag={() => {
            setTagTarget(menu.entry)
            setMenu(null)
          }}
          onQuickAccess={() => {
            addQuickAccess({ path: menu.entry.path, name: menu.entry.name })
            setMenu(null)
          }}
          onProperties={() => {
            setPropertiesTarget(menu.entry)
            setMenu(null)
          }}
          onClose={() => setMenu(null)}
        />
      )}

      {backgroundMenu && (
        <BackgroundContextMenu
          anchorX={backgroundMenu.anchorX}
          anchorY={backgroundMenu.anchorY}
          canPaste={clipPaths.length > 0}
          showHidden={showHidden}
          view={view}
          detailsPane={detailsPane}
          labels={{
            newFolder: translateText('newFolder'),
            newFile: translateText('newFile'),
            paste: translateText('paste'),
            refresh: translateText('refresh'),
            copyCurrentPath: translateText('copyCurrentPath'),
            grid: translateText('gridView'),
            list: translateText('listView'),
            details: translateText('details'),
            compact: translateText('compact'),
            showHidden: translateText('showHidden'),
            showDetailsPane: translateText('showDetailsPane'),
            emptyTrash: translateText('emptyTrash')
          }}
          onNewFolder={() => {
            setFolderDialog({ open: true, error: null })
            setBackgroundMenu(null)
          }}
          onNewFile={() => {
            setFileDialog({ open: true, error: null })
            setBackgroundMenu(null)
          }}
          onPaste={() => {
            setBackgroundMenu(null)
            void doPaste(currentPath)
          }}
          onRefresh={() => {
            void refresh()
            setBackgroundMenu(null)
          }}
          onCopyCurrentPath={() => {
            void copyText(currentPath)
            setBackgroundMenu(null)
          }}
          onGrid={() => {
            setView('grid')
            setBackgroundMenu(null)
          }}
          onList={() => {
            setView('list')
            setBackgroundMenu(null)
          }}
          onDetails={() => {
            setView('details')
            setBackgroundMenu(null)
          }}
          onCompact={() => {
            setView('compact')
            setBackgroundMenu(null)
          }}
          onToggleHidden={() => {
            setShowHidden(!showHidden)
            setBackgroundMenu(null)
          }}
          onToggleDetailsPane={() => {
            setDetailsPane(!detailsPane)
            setBackgroundMenu(null)
          }}
          {...(isTrash && entries.length > 0
            ? {
                onEmptyTrash: () => {
                  setEmptyTrashOpen(true)
                  setBackgroundMenu(null)
                }
              }
            : {})}
          onClose={() => setBackgroundMenu(null)}
        />
      )}

      {folderDialog.open && (
        <PromptDialog
          title={translateText('newFolder')}
          placeholder={translateText('newFolderPrompt')}
          confirmLabel={translateText('create')}
          cancelLabel={translateText('cancel')}
          externalError={folderDialog.error}
          onSubmit={(name) => void handleCreateFolder(name)}
          onClose={() => setFolderDialog(closedForm)}
        />
      )}
      {fileDialog.open && (
        <PromptDialog
          title={translateText('newFile')}
          placeholder={translateText('newFilePrompt')}
          confirmLabel={translateText('create')}
          cancelLabel={translateText('cancel')}
          externalError={fileDialog.error}
          onSubmit={(name) => void handleCreateFile(name)}
          onClose={() => setFileDialog(closedForm)}
        />
      )}
      {renameTarget && (
        <PromptDialog
          title={translateText('renameTitle')}
          placeholder={translateText('nameField')}
          initialValue={renameTarget.name}
          confirmLabel={translateText('rename')}
          cancelLabel={translateText('cancel')}
          externalError={renameError}
          onSubmit={(name) => void handleRename(name)}
          onClose={() => {
            setRenameTarget(null)
            setRenameError(null)
          }}
        />
      )}
      {deleteTargets && (
        <ConfirmDialog
          title={translateText('deleteTitle')}
          message={translateText('deleteMessage').replace('{count}', String(deleteTargets.length))}
          confirmLabel={translateText('delete_')}
          cancelLabel={translateText('cancel')}
          danger
          onConfirm={() => void handleDelete()}
          onClose={() => setDeleteTargets(null)}
        />
      )}
      {emptyTrashOpen && (
        <ConfirmDialog
          title={translateText('emptyTrashTitle')}
          message={translateText('emptyTrashMessage').replace('{count}', String(entries.length))}
          confirmLabel={translateText('emptyTrash')}
          cancelLabel={translateText('cancel')}
          danger
          onConfirm={() => void handleEmptyTrash()}
          onClose={() => setEmptyTrashOpen(false)}
        />
      )}
      {conflictState && (
        <ConflictDialog
          conflicts={conflictState.scan.conflicts}
          fileCount={conflictState.scan.files}
          labels={{
            title: translateText('conflictTitle'),
            message: translateText('conflictMessage'),
            replace: translateText('replace'),
            skip: translateText('skip'),
            keepBoth: translateText('keepBoth'),
            applyToAll: translateText('applyToAll'),
            cancel: translateText('cancel'),
            cont: translateText('cont')
          }}
          onConfirm={(resolutions) => {
            const state = conflictState
            setConflictState(null)
            void runTransfer(state.sources, state.dest, state.cut, resolutions)
          }}
          onClose={() => setConflictState(null)}
        />
      )}
      {notice && (
        <ConfirmDialog
          title={notice.title}
          message={notice.message}
          confirmLabel={translateText('ok')}
          cancelLabel={translateText('cancel')}
          hideCancel
          onConfirm={() => setNotice(null)}
          onClose={() => setNotice(null)}
        />
      )}
      {propertiesTarget && (
        <PropertiesDialog
          entry={propertiesTarget}
          folderLabel={translateText('folder')}
          language={language}
          labels={{
            title: translateText('propertiesTitle'),
            name: translateText('nameField'),
            type: translateText('typeField'),
            location: translateText('locationField'),
            size: translateText('sizeField'),
            contains: translateText('contains'),
            files: translateText('filesCount'),
            folders: translateText('foldersCount'),
            modified: translateText('modifiedField'),
            calculating: translateText('sizeUnknown'),
            truncated: translateText('sizeTruncated'),
            ok: translateText('ok'),
            cancel: translateText('cancel')
          }}
          onClose={() => setPropertiesTarget(null)}
        />
      )}
      {tagTarget && (
        <TagDialog
          tags={tags}
          labels={{
            create: translateText('createTag'),
            name: translateText('tagName'),
            cancel: translateText('cancel'),
            save: translateText('save'),
            deleteTag: translateText('deleteTag'),
            unassignTag: translateText('removeTag'),
            deleteTagConfirm: translateText('deleteTagEverywhere')
          }}
          onClose={() => setTagTarget(null)}
          onAssign={(tagId) => {
            assignTag(tagTarget.path, tagId)
            setTagTarget(null)
          }}
          onUnassign={(tagId) => {
            unassignTag(tagTarget.path, tagId)
          }}
          onDeleteTag={(tagId) => {
            setDeleteTagId(tagId)
          }}
          onCreate={(tag) => {
            const created = createTag(tag)
            assignTag(tagTarget.path, created.id)
            setTagTarget(null)
          }}
        />
      )}
      {deleteTagId && (
        <ConfirmDialog
          title={translateText('deleteTag')}
          message={translateText('deleteTagEverywhereMessage').replace('{name}', tags.find((tag) => tag.id === deleteTagId)?.name ?? '')}
          confirmLabel={translateText('delete_')}
          cancelLabel={translateText('cancel')}
          danger
          onConfirm={() => {
            removeTag(deleteTagId)
            setDeleteTagId(null)
          }}
          onClose={() => setDeleteTagId(null)}
        />
      )}
      {preview && previewKind && (
        <PreviewPane
          entry={preview}
          type={previewKind}
          language={language}
          title={translateText(previewKind === 'image' ? 'imagePreview' : previewKind === 'video' ? 'videoPreview' : 'textPreview')}
          labels={{
            image: translateText('imagePreview'),
            video: translateText('videoPreview'),
            text: translateText('textPreview'),
            loading: translateText('loading'),
            binary: translateText('notTextPreview'),
            truncated: translateText('truncatedPreview'),
            size: translateText('size'),
            close: translateText('close')
          }}
          onClose={() => setPreview(null)}
        />
      )}
    </section>
  )
}
