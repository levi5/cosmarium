import { listen } from '@tauri-apps/api/event'
import { useEffect, useRef, useState } from 'react'
import { errorMessage } from '../lib/format'
import { filesystem } from '../services/tauri/filesystem'

export function useDirectoryWatch(path: string, onChanged: () => void) {
  const latest = useRef(onChanged)
  latest.current = onChanged
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!path) return
    let cancelled = false
    let unlisten: (() => void) | undefined
    let watching = false
    setError(null)
    const subscribe = async () => {
      const off = await listen<string>('cosmarium://fs-changed', ({ payload }) => {
        if (!cancelled && payload === path) latest.current()
      })
      if (cancelled) {
        off()
        return
      }
      unlisten = off
      await filesystem.watchDirectory(path)
      if (cancelled) await filesystem.unwatchDirectory(path)
      else watching = true
    }
    void subscribe().catch((reason) => {
      if (!cancelled) setError(errorMessage(reason))
    })
    return () => {
      cancelled = true
      unlisten?.()
      if (watching) void filesystem.unwatchDirectory(path).catch(() => {})
    }
  }, [path])
  return error
}
