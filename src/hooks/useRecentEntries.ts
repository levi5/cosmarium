import { useEffect, useMemo, useState } from 'react'
import { recencyOf, sortByRecency } from '../lib/search'
import { filesystem } from '../services/tauri/filesystem'
import { useRecentStore } from '../stores/recentStore'
import type { FileEntry } from '../types/explorer'

const EMPTY: FileEntry[] = []

type Options = {
  enabled: boolean
  roots: string[]
  limit?: number
  includeHidden: boolean
  reloadToken?: number
}

function remembered(item: { name: string; path: string; kind: 'file' | 'directory'; usedAt: number }): FileEntry {
  return { name: item.name, path: item.path, kind: item.kind, size: 0, modified: null, accessed: item.usedAt, hidden: false }
}

export function useRecentEntries({ enabled, roots, limit = 40, includeHidden, reloadToken = 0 }: Options): {
  entries: FileEntry[]
  loading: boolean
  clear: () => void
} {
  const items = useRecentStore((state) => state.items)
  const clearedAt = useRecentStore((state) => state.clearedAt)
  const clear = useRecentStore((state) => state.clear)
  const [scanned, setScanned] = useState<FileEntry[]>(EMPTY)
  const [loading, setLoading] = useState(enabled)

  useEffect(() => {
    if (!enabled || roots.length === 0) {
      setScanned(EMPTY)
      setLoading(false)
      return
    }
    let cancelled = false
    const request = reloadToken
    setLoading(true)
    filesystem
      .recentEntries({ roots, limit, includeHidden })
      .then((result) => {
        if (!cancelled && request === reloadToken) setScanned(result)
      })
      .catch(() => {
        if (!cancelled) setScanned(EMPTY)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [enabled, includeHidden, limit, reloadToken, roots])

  const entries = useMemo(() => {
    if (!enabled) return EMPTY
    const cutoff = clearedAt === null ? 0 : clearedAt
    const merged = new Map<string, FileEntry>()
    for (const entry of scanned) {
      if (recencyOf(entry) >= cutoff) merged.set(entry.path, entry)
    }
    for (const item of items) {
      if (item.usedAt < cutoff) continue
      const known = merged.get(item.path)
      merged.set(item.path, known ? { ...known, accessed: item.usedAt } : remembered(item))
    }
    return sortByRecency([...merged.values()]).slice(0, limit)
  }, [clearedAt, enabled, items, limit, scanned])

  return { entries, loading, clear }
}
