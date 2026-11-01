import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useDirectoryWatch } from '../hooks/useDirectoryWatch'
import { filesystem } from '../services/tauri/filesystem'
import { useExplorerStore } from '../stores/explorerStore'
import type { ExplorerTab, FileEntry, Locations, Volume } from '../types/explorer'
import { usePreferences } from './preferences'

export type { ExplorerTab, FileEntry, Locations, Volume } from '../types/explorer'

type FileWorkspace = {
  entries: FileEntry[]
  currentPath: string
  locations: Locations | null
  volumes: Volume[]
  loading: boolean
  error: string | null
  watchError: string | null
  tabs: ExplorerTab[]
  activeTabId: string | null
  navigateTo: (path: string) => void
  goBack: () => void
  goForward: () => void
  goUp: () => Promise<void>
  refresh: () => Promise<void>
  createFolder: (name: string) => Promise<void>
  createFile: (name: string) => Promise<FileEntry>
  insertEntry: (entry: FileEntry) => void
  removeEntries: (paths: string[]) => void
  replaceEntry: (oldPath: string, entry: FileEntry) => void
}

const FileWorkspaceContext = createContext<FileWorkspace | null>(null)

export function FileWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { tabs, activeTabId, initialize, navigate, goBack, goForward } = useExplorerStore()
  const activeTab = tabs.find((tab) => tab.id === activeTabId)
  const currentPath = activeTab?.path || ''

  const [allEntries, setEntries] = useState<FileEntry[]>([])
  const [locations, setLocations] = useState<Locations | null>(null)
  const [volumes, setVolumes] = useState<Volume[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { showHidden } = usePreferences()

  const requestId = useRef(0)

  const entries = useMemo(() => (showHidden ? allEntries : allEntries.filter((entry) => !entry.hidden)), [allEntries, showHidden])

  useEffect(() => {
    filesystem
      .getLocations()
      .then((result) => {
        setLocations(result)
        initialize(result.home)
      })
      .catch((reason) => {
        setLoading(false)
        setError(typeof reason === 'string' ? reason : 'Could not load your home folder. Check your system permissions.')
      })
  }, [initialize])

  useEffect(() => {
    filesystem
      .getVolumes()
      .then(setVolumes)
      .catch(() => setVolumes([]))
  }, [])

  const loadDirectory = useCallback(async (path: string) => {
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const result = await filesystem.listDirectory(path)
      if (requestId.current === id) setEntries(result)
    } catch (reason) {
      if (requestId.current !== id) return
      setEntries([])
      setError(typeof reason === 'string' ? reason : reason instanceof Error ? reason.message : 'Could not open this location.')
    } finally {
      if (requestId.current === id) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (currentPath) void loadDirectory(currentPath)
  }, [currentPath, loadDirectory])

  const watchError = useDirectoryWatch(currentPath, () => void loadDirectory(currentPath))

  const navigateTo = useCallback(
    (path: string) => {
      if (path) navigate(path)
    },
    [navigate]
  )

  const refresh = useCallback(async () => {
    if (currentPath) await loadDirectory(currentPath)
  }, [currentPath, loadDirectory])

  const goUp = useCallback(async () => {
    if (!currentPath) return
    try {
      navigate(await filesystem.getParent(currentPath))
    } catch {
      return
    }
  }, [currentPath, navigate])

  const insertEntry = useCallback((entry: FileEntry) => {
    setEntries((current) => {
      const without = current.filter((item) => item.path !== entry.path)
      return [...without, entry]
    })
  }, [])

  const removeEntries = useCallback((paths: string[]) => {
    const doomed = new Set(paths)
    setEntries((current) => current.filter((item) => !doomed.has(item.path)))
  }, [])

  const replaceEntry = useCallback((oldPath: string, entry: FileEntry) => {
    setEntries((current) => [...current.filter((item) => item.path !== oldPath && item.path !== entry.path), entry])
  }, [])

  const createFolder = useCallback(
    async (name: string) => {
      if (!currentPath || !name.trim()) return
      const entry = await filesystem.createDirectory(currentPath, name.trim())
      insertEntry(entry)
    },
    [currentPath, insertEntry]
  )

  const createFile = useCallback(
    async (name: string) => {
      if (!currentPath || !name.trim()) throw new Error('Invalid name.')
      const entry = await filesystem.createFile(currentPath, name.trim())
      insertEntry(entry)
      return entry
    },
    [currentPath, insertEntry]
  )

  const value = useMemo<FileWorkspace>(
    () => ({
      entries,
      currentPath,
      locations,
      volumes,
      loading,
      error,
      watchError,
      tabs,
      activeTabId,
      navigateTo,
      goBack,
      goForward,
      goUp,
      refresh,
      createFolder,
      createFile,
      insertEntry,
      removeEntries,
      replaceEntry
    }),
    [
      entries,
      currentPath,
      locations,
      volumes,
      loading,
      error,
      watchError,
      tabs,
      activeTabId,
      navigateTo,
      goBack,
      goForward,
      goUp,
      refresh,
      createFolder,
      createFile,
      insertEntry,
      removeEntries,
      replaceEntry
    ]
  )

  return <FileWorkspaceContext.Provider value={value}>{children}</FileWorkspaceContext.Provider>
}

export function useFileWorkspace() {
  const value = useContext(FileWorkspaceContext)
  if (!value) throw new Error('useFileWorkspace must be used within FileWorkspaceProvider')
  return value
}
