import { useCallback, useEffect, useRef, useState } from 'react'
import { useDirectoryWatch } from '../../hooks/useDirectoryWatch'
import { errorMessage } from '../../lib/format'
import { filesystem } from '../../services/tauri/filesystem'
import type { FileEntry } from '../../types/explorer'

export function useDirectoryPane(initialPath: string) {
  const [path, setPath] = useState(initialPath)
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const request = useRef(0)
  const refresh = useCallback(async () => {
    const token = ++request.current
    setLoading(true)
    setError(null)
    const result = await _try.async(() => filesystem.listDirectory(path))
    if (token !== request.current) return
    result.match({
      right: setEntries,
      left: (reason) => {
        setError(errorMessage(reason))
        setEntries([])
      }
    })
    setLoading(false)
  }, [path])
  useEffect(() => {
    void refresh()
    return () => {
      request.current++
    }
  }, [refresh])
  const watchError = useDirectoryWatch(path, () => void refresh())
  const insertEntry = (entry: FileEntry) => setEntries((current) => [...current.filter((item) => item.path !== entry.path), entry])
  const createFolder = async (name: string) => insertEntry(await filesystem.createDirectory(path, name))
  const createFile = async (name: string) => {
    const entry = await filesystem.createFile(path, name)
    insertEntry(entry)
    return entry
  }
  const removeEntries = (paths: string[]) => setEntries((current) => current.filter((entry) => !paths.includes(entry.path)))
  const replaceEntry = (oldPath: string, entry: FileEntry) =>
    setEntries((current) => [...current.filter((item) => item.path !== oldPath && item.path !== entry.path), entry])
  return { path, currentPath: path, navigate: setPath, entries, loading, error, watchError, refresh, createFolder, createFile, removeEntries, replaceEntry }
}

import { _try } from 'funcio'
