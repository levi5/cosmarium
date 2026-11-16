import { useEffect, useMemo, useRef, useState } from 'react'
import { FOLDER_SIZE_CACHE_LIMIT } from '../constants/files'
import { filesystem } from '../services/tauri/filesystem'
import type { FileEntry } from '../types/explorer'

export type FolderSizes = Record<string, number>

export function useFolderSizes(entries: FileEntry[], enabled: boolean): FolderSizes {
  const [sizes, setSizes] = useState<FolderSizes>({})
  const cache = useRef<FolderSizes>({})
  // Listing refreshes replace entry objects, even when the folders have not changed.
  const folderKey = JSON.stringify(
    entries
      .filter((entry) => entry.kind === 'directory')
      .map((entry) => entry.path)
      .sort()
  )
  const folders = useMemo<string[]>(() => JSON.parse(folderKey), [folderKey])

  useEffect(() => {
    if (!enabled) {
      cache.current = {}
      setSizes({})
      return
    }
    const missing = folders.filter((path) => cache.current[path] === undefined)
    if (missing.length === 0) return

    let cancelled = false
    filesystem
      .getFolderSizes(missing)
      .then((result) => {
        if (cancelled) return
        const next: FolderSizes = { ...cache.current }
        for (const [path, stats] of Object.entries(result)) next[path] = stats.size
        const keys = Object.keys(next)
        if (keys.length > FOLDER_SIZE_CACHE_LIMIT) {
          for (const key of keys.slice(0, keys.length - FOLDER_SIZE_CACHE_LIMIT)) delete next[key]
        }
        cache.current = next
        setSizes(next)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [folders, enabled])

  return sizes
}
