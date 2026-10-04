import { useEffect, useRef, useState } from 'react'
import { FOLDER_SIZE_CACHE_LIMIT } from '../constants/files'
import { filesystem } from '../services/tauri/filesystem'
import type { FileEntry } from '../types/explorer'

export type FolderSizes = Record<string, number>

export function useFolderSizes(entries: FileEntry[], enabled: boolean): FolderSizes {
  const [sizes, setSizes] = useState<FolderSizes>({})
  const cache = useRef<FolderSizes>({})
  const request = useRef(0)

  useEffect(() => {
    if (!enabled) {
      cache.current = {}
      setSizes({})
      return
    }
    const missing = entries
      .filter((entry) => entry.kind === 'directory')
      .map((entry) => entry.path)
      .filter((path) => cache.current[path] === undefined)
    if (missing.length === 0) return

    const token = ++request.current
    filesystem
      .getFolderSizes(missing)
      .then((result) => {
        if (request.current !== token) return
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
  }, [entries, enabled])

  return sizes
}
