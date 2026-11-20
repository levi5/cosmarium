import { type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { STORAGE } from '../../constants/storage'
import { useFileTransfers } from '../../hooks/useFileTransfers'
import { useFolderSizes } from '../../hooks/useFolderSizes'
import { useRecentEntries } from '../../hooks/useRecentEntries'
import { useShortcuts } from '../../hooks/useShortcuts'
import { useStoredChoice } from '../../hooks/useStoredChoice'
import { useFileWorkspace } from '../../lib/files'
import { errorMessage, previewType } from '../../lib/format'
import { createTranslator } from '../../lib/i18n'
import { type Tag, useOrganizer } from '../../lib/organizer'
import { usePreferences } from '../../lib/preferences'
import { filterEntries, sortByRecency, sortEntries } from '../../lib/search'
import { applySelectionRange, selectionRange } from '../../lib/selection'
import { isActivatableTarget } from '../../lib/shortcuts'
import { filesystem } from '../../services/tauri/filesystem'
import { useClipboardStore } from '../../stores/clipboardStore'
import { useExplorerStore } from '../../stores/explorerStore'
import type { SavedWorkspace, WorkspaceSnapshot } from '../../stores/productivityStore'
import { useRecentStore } from '../../stores/recentStore'
import { useSelectionStore } from '../../stores/selectionStore'
import type { FileEntry } from '../../types/explorer'
import { useEntryActions } from '../EntryDialogs/useEntryActions'
import { useInspection } from '../EntryDialogs/useInspection'
import { useFileSearch } from '../SavedSearches/useFileSearch'

type Anchor = { anchorX: number; anchorY: number }
type MenuState = Anchor & { entry: FileEntry }
const NO_ROOTS: string[] = []

export function useFileBrowser(compact: boolean) {
  const preferences = usePreferences()
  const { language, showSize, showHidden, setShowHidden } = preferences
  const workspace = useFileWorkspace()
  const { entries, currentPath, navigateTo, locations } = workspace
  const organizer = useOrganizer()
  const { tags, taggedPaths } = organizer
  const { selected, setSelected } = useSelectionStore()
  const recordRecent = useRecentStore((state) => state.record)
  const clipboard = useClipboardStore()
  const t = useMemo(() => createTranslator(language), [language])
  const [view, setView] = useStoredChoice(STORAGE.fileView, ['list', 'grid', 'details', 'compact'] as const, 'list')
  const [sortKey, setSortKey] = useStoredChoice(STORAGE.sortKey, ['name', 'modified', 'accessed', 'type', 'size'] as const, 'name')
  const [sortDirection, setSortDirection] = useStoredChoice(STORAGE.sortDirection, ['asc', 'desc'] as const, 'asc')
  const [detailsValue, setDetailsValue] = useStoredChoice(STORAGE.detailsPane, ['true', 'false'] as const, 'false')
  const detailsPane = detailsValue === 'true'
  const setDetailsPane = (show: boolean) => setDetailsValue(show ? 'true' : 'false')
  const [query, setQuery] = useState('')
  const search = useFileSearch(query, currentPath, showHidden, !compact, entries)
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [backgroundMenu, setBackgroundMenu] = useState<Anchor | null>(null)
  const [activeEntry, setActiveEntry] = useState<FileEntry | null>(null)
  const inspection = useInspection()
  const actions = useEntryActions()
  const transfers = useFileTransfers({ copying: t('copying'), moving: t('moving') }, actions.setNotice)
  const [recentsToken, setRecentsToken] = useState(0)
  const [split, setSplit] = useState(false)
  const [secondaryPath, setSecondaryPath] = useState('')
  const [paneRevision, setPaneRevision] = useState(0)
  const [productivityOpen, setProductivityOpen] = useState(false)
  const snapshotWorkspace = (): WorkspaceSnapshot => ({
    paths: workspace.tabs.map((tab) => tab.path),
    activeIndex: Math.max(
      0,
      workspace.tabs.findIndex((tab) => tab.id === workspace.activeTabId)
    ),
    view,
    sortKey,
    sortDirection,
    query,
    detailsPane,
    split,
    secondaryPath: secondaryPath || currentPath,
    showHidden
  })
  const restoreWorkspace = ({ snapshot: s }: SavedWorkspace) => {
    useExplorerStore.getState().restoreWorkspace(s.paths, s.activeIndex)
    setView(s.view)
    setSortKey(s.sortKey)
    setSortDirection(s.sortDirection)
    setQuery(s.query)
    search.refresh()
    setDetailsPane(s.detailsPane)
    setSplit(s.split)
    setSecondaryPath(s.secondaryPath)
    setPaneRevision((value) => value + 1)
    setShowHidden(s.showHidden)
    setSelected([])
    setActiveEntry(null)
  }
  const previousPath = useRef(currentPath)
  const selectionAnchor = useRef<string | null>(null)
  useEffect(() => {
    if (previousPath.current !== currentPath) {
      setSelected([])
      setActiveEntry(null)
      selectionAnchor.current = null
      previousPath.current = currentPath
    }
  }, [currentPath, setSelected])
  const recentRoots = useMemo(
    () =>
      locations
        ? [...new Set([locations.home, locations.desktop, locations.downloads, locations.documents, locations.pictures, locations.music, locations.videos])]
        : NO_ROOTS,
    [locations]
  )
  const recents = useRecentEntries({ enabled: compact, roots: recentRoots, limit: 40, includeHidden: showHidden, reloadToken: recentsToken })
  const folderSizes = useFolderSizes(compact ? recents.entries : entries, showSize)
  const searchRef = useRef<HTMLInputElement>(null)
  const tagsOf = useCallback(
    (path: string): Tag[] => (taggedPaths[path] || []).map((id) => tags.find((tag) => tag.id === id)).filter((tag): tag is Tag => Boolean(tag)),
    [taggedPaths, tags]
  )
  const visibleEntries = useMemo(
    () => (compact ? sortByRecency(recents.entries) : sortEntries(filterEntries(search.searchResults ?? entries, search.parsedQuery), sortKey, sortDirection)),
    [compact, recents.entries, search.searchResults, entries, search.parsedQuery, sortKey, sortDirection]
  )
  const targetsFor = (entry?: FileEntry): FileEntry[] => {
    const available = compact ? recents.entries : (search.searchResults ?? entries)
    if (entry && !selected.includes(entry.path)) return [entry]
    if (selected.length) return available.filter((item) => selected.includes(item.path))
    return activeEntry ? [activeEntry] : []
  }
  const detailsEntry =
    visibleEntries.find((entry) => selected.includes(entry.path) && entry.path === activeEntry?.path) ??
    visibleEntries.find((entry) => selected.includes(entry.path)) ??
    null
  const copy = (mode: 'copy' | 'cut', entry?: FileEntry) => {
    const targets = targetsFor(entry)
    if (targets.length)
      clipboard.setClipboard(
        mode,
        targets.map((item) => item.path)
      )
  }
  const open = (entry: FileEntry) => {
    recordRecent({ path: entry.path, name: entry.name, kind: entry.kind })
    if (entry.kind === 'directory') navigateTo(entry.path)
    else void filesystem.openWithDefault(entry.path).catch((reason) => actions.setNotice({ title: t('openSystem'), message: errorMessage(reason) }))
  }
  const select = (event: MouseEvent<HTMLElement>, entry: FileEntry) => {
    const additive = event.ctrlKey || event.metaKey
    setActiveEntry(entry)
    if (event.shiftKey) {
      const range = selectionRange(
        visibleEntries.map((item) => item.path),
        selectionAnchor.current,
        entry.path
      )
      setSelected(applySelectionRange(selected, range, additive))
      return
    }
    selectionAnchor.current = entry.path
    const paths = selected.includes(entry.path) ? selected.filter((item) => item !== entry.path) : [...selected, entry.path]
    setSelected(additive ? paths : [entry.path])
  }
  const openMenu = (event: MouseEvent<HTMLElement>, entry: FileEntry) => {
    event.preventDefault()
    event.stopPropagation()
    setBackgroundMenu(null)
    setActiveEntry(entry)
    if (!selected.includes(entry.path)) setSelected([entry.path])
    setMenu({ entry, anchorX: event.clientX, anchorY: event.clientY })
  }
  const openBackgroundMenu = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setMenu(null)
    setBackgroundMenu({ anchorX: event.clientX, anchorY: event.clientY })
  }
  const requestDelete = (entry?: FileEntry, permanent = false) => {
    const targets = targetsFor(entry)
    if (targets.length) {
      if (permanent) actions.setPermanentDeleteTargets(targets)
      else actions.setDeleteTargets(targets)
    }
  }
  const hasOverlay = Boolean(
    actions.hasDialog || transfers.conflictState || transfers.rehearsalState || productivityOpen || inspection.hasDialog || menu || backgroundMenu
  )
  useShortcuts({
    enabled: !hasOverlay,
    hasTargets: selected.length > 0 || Boolean(activeEntry),
    handlers: {
      focusSearch: () => {
        searchRef.current?.focus()
        searchRef.current?.select()
      },
      toggleHidden: () => setShowHidden(!showHidden),
      toggleDetailsPane: () => {
        if (detailsEntry) setDetailsPane(!detailsPane)
      },
      cycleView: () => setView(view === 'grid' ? 'list' : 'grid'),
      copy: () => copy('copy'),
      cut: () => copy('cut'),
      paste: () => void transfers.doPaste(currentPath),
      selectAll: () => setSelected(visibleEntries.map((entry) => entry.path)),
      delete: () => requestDelete(),
      deletePermanently: () => requestDelete(undefined, true),
      rename: () => {
        const entry = targetsFor()[0]
        if (entry) actions.doRename(entry)
      },
      open: (event) => {
        if (activeEntry && !(event.target as HTMLElement | null)?.closest('[role="option"]')) open(activeEntry)
      },
      preview: (event) => {
        if (activeEntry && !isActivatableTarget(event.target) && previewType(activeEntry)) inspection.setPreview(activeEntry)
      },
      properties: () => {
        const entry = targetsFor()[0]
        if (entry) inspection.setPropertiesTarget(entry)
      },
      newFolder: () => actions.setFolderDialog({ open: true, error: null }),
      newFile: () => actions.setFileDialog({ open: true, error: null })
    }
  })
  return {
    compact,
    preferences,
    workspace,
    organizer,
    clipboard,
    t,
    selected,
    setSelected,
    view,
    setView,
    sortKey,
    setSortKey,
    sortDirection,
    setSortDirection,
    query,
    setQuery,
    search,
    detailsPane,
    detailsEntry,
    setDetailsPane,
    menu,
    setMenu,
    backgroundMenu,
    setBackgroundMenu,
    activeEntry,
    setActiveEntry,
    inspection,
    actions,
    transfers,
    recents,
    setRecentsToken,
    split,
    setSplit,
    secondaryPath,
    setSecondaryPath,
    paneRevision,
    productivityOpen,
    setProductivityOpen,
    snapshotWorkspace,
    restoreWorkspace,
    folderSizes,
    searchRef,
    tagsOf,
    visibleEntries,
    targetsFor,
    copy,
    open,
    select,
    openMenu,
    openBackgroundMenu,
    requestDelete,
    isTrash: Boolean(locations?.trash && locations.trash !== locations.home && currentPath === locations.trash),
    busy: compact ? recents.loading : workspace.loading,
    failure: compact ? null : (search.searchError ?? workspace.error)
  }
}

export type FileBrowserController = ReturnType<typeof useFileBrowser>
