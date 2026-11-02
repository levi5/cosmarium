import { convertFileSrc } from '@tauri-apps/api/core'
import { _try } from 'funcio'
import { useEffect, useState } from 'react'
import { errorMessage } from '../lib/format'
import { filesystem } from '../services/tauri/filesystem'

type State = { path: string; source: string | null; error: string | null }

export function useMediaPreview(path: string, enabled: boolean) {
  const [state, setState] = useState<State | null>(null)
  useEffect(() => {
    if (!enabled) return
    let alive = true
    setState(null)
    void _try
      .async(async () => convertFileSrc(await filesystem.prepareMediaPreview(path)))
      .then((result) => {
        if (!alive) return
        result.match({
          right: (source) => setState({ path, source, error: null }),
          left: (reason) => setState({ path, source: null, error: errorMessage(reason) })
        })
      })
    return () => {
      alive = false
    }
  }, [path, enabled])
  return enabled && state?.path === path ? state : { path, source: null, error: null }
}
