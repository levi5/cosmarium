import { listen } from '@tauri-apps/api/event'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
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

  const requestPath = useRef('')
  const watchedPath = useRef('')

  const entries = useMemo(() => (showHidden ? allEntries : allEntries.filter((entry) => !entry.hidden)), [allEntries, showHidden])

  useEffect(() => {
    filesystem
      .getLocations()
      .then((result) => {
        setLocations(result)
        initialize(result.home)
      })
      .catch(() => {
        setLoading(false)
        setError(null)
      })
  }, [initialize])

  useEffect(() => {
    filesystem
      .getVolumes()
      .then(setVolumes)
      .catch(() => setVolumes([]))
  }, [])

  const loadDirectory = useCallback(async (path: string) => {
    requestPath.current = path
    setLoading(true)
    setError(null)
    try {
      const result = await filesystem.listDirectory(path)
      if (requestPath.current === path) setEntries(result)
    } catch (reason) {
      if (requestPath.current !== path) return
      setEntries([])
      setError(typeof reason === 'string' ? reason : reason instanceof Error ? reason.message : 'Could not open this location.')
    } finally {
      if (requestPath.current === path) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (currentPath) void loadDirectory(currentPath)
  }, [currentPath, loadDirectory])

  useEffect(() => {
    if (!currentPath) return
    let cancelled = false
    let unlisten: (() => void) | undefined
    const onChanged = (event: { payload: string }) => {
      if (cancelled) return
      if (event.payload !== currentPath) return
      void loadDirectory(currentPath)
    }
    listen<string>('cosmarium://fs-changed', onChanged)
      .then((off) => {
        if (cancelled) off()
        else unlisten = off
      })
      .catch(() => {})
    filesystem
      .watchDirectory(currentPath)
      .then(() => {
        watchedPath.current = currentPath
      })
      .catch(() => {})
    return () => {
      cancelled = true
      unlisten?.()
      if (watchedPath.current === currentPath) {
        watchedPath.current = ''
        void filesystem.unwatchDirectory(currentPath).catch(() => {})
      }
    }
  }, [currentPath, loadDirectory])

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
