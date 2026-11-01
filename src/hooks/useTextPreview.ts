import { useEffect, useState } from 'react'
import { filesystem } from '../services/tauri/filesystem'
import type { TextPreview } from '../types/explorer'

type PreviewState = { status: 'loading' } | { status: 'ready'; preview: TextPreview } | { status: 'error'; error: string }

export function useTextPreview(path: string, enabled: boolean) {
  const [state, setState] = useState<PreviewState>({ status: 'loading' })
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setState({ status: 'loading' })
    filesystem.readTextPreview(path).then(
      (preview) => {
        if (!cancelled) setState({ status: 'ready', preview })
      },
      (reason) => {
        if (!cancelled) setState({ status: 'error', error: String(reason) })
      }
    )
    return () => {
      cancelled = true
    }
  }, [path, enabled])
  return state
}
