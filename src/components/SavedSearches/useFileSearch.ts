import { useEffect, useMemo, useState } from 'react'
import { errorMessage } from '../../lib/format'
import { parseQuery } from '../../lib/search'
import { filesystem } from '../../services/tauri/filesystem'
import type { FileEntry } from '../../types/explorer'

export function useFileSearch(query: string, root: string, showHidden: boolean, enabled: boolean) {
  const parsedQuery = useMemo(() => parseQuery(query, showHidden), [query, showHidden])
  const [searchResults, setResults] = useState<FileEntry[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!query.trim() || !root || !enabled) {
      setResults(null)
      setSearching(false)
      setError(null)
      return
    }
    let cancelled = false
    setSearching(true)
    setResults(null)
    setError(null)
    const timer = window.setTimeout(() => {
      filesystem
        .searchEntries({ ...parsedQuery, root, limit: 5000 })
        .then(
          (results) => {
            if (!cancelled) setResults(results)
          },
          (reason) => {
            if (!cancelled) {
              setResults([])
              setError(errorMessage(reason))
            }
          }
        )
        .finally(() => {
          if (!cancelled) setSearching(false)
        })
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query, root, enabled, parsedQuery])
  return { parsedQuery, searchResults, searching, searchError: error, hasQuery: Boolean(query.trim()) }
}
