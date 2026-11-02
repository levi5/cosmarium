import { _Array } from 'funcio'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FileEntry } from '../../types/explorer'

export function usePaneSelection(entries: FileEntry[]) {
  const [paths, setPaths] = useState<string[]>([])
  const [focused, setFocused] = useState<string | null>(null)
  const available = useMemo(() => new Set(entries.map((entry) => entry.path)), [entries])
  const selected = useMemo(() => _Array.uniq(paths.filter((path) => available.has(path))), [paths, available])
  const active = focused && available.has(focused) ? focused : null
  useEffect(() => {
    setPaths((current) => {
      const next = current.filter((path) => available.has(path))
      return next.length === current.length ? current : next
    })
    setFocused((current) => (current && available.has(current) ? current : null))
  }, [available])
  const setSelected = useCallback((next: string[]) => setPaths(_Array.uniq(next)), [])
  return { selected, setSelected, active, setActive: setFocused }
}
