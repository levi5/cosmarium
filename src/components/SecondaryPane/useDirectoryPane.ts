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
    try {
      const next = await filesystem.listDirectory(path)
      if (token === request.current) setEntries(next)
    } catch (reason) {
      if (token === request.current) {
        setError(errorMessage(reason))
        setEntries([])
      }
    } finally {
      if (token === request.current) setLoading(false)
    }
  }, [path])
  useEffect(() => {
    void refresh()
    return () => {
      request.current++
    }
  }, [refresh])
  const watchError = useDirectoryWatch(path, () => void refresh())
  return { path, navigate: setPath, entries, loading, error, watchError, refresh }
}
