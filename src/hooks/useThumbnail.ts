import { useEffect, useRef, useState } from 'react'
import { requestThumbnail, supportsThumbnail, thumbnailKey } from '../lib/thumbnails'
import type { FileEntry } from '../types/explorer'

export function useThumbnail(entry: FileEntry) {
  const { path, name, size, modified } = entry
  const ref = useRef<HTMLSpanElement>(null)
  const [state, setState] = useState<{ key: string; source: string } | null>(null)
  const key = thumbnailKey(entry)
  const supported = Boolean(entry.path) && supportsThumbnail(entry)
  useEffect(() => {
    if (!supported || !ref.current) return
    let controller: AbortController | undefined
    let completed = false
    const update = (visible: boolean) => {
      if (!visible) {
        controller?.abort()
        controller = undefined
        return
      }
      if (controller || completed) return
      controller = new AbortController()
      const signal = controller.signal
      void requestThumbnail({ path, name, size, modified, kind: 'file', accessed: null, hidden: false }, signal)
        .then((source) => {
          if (!signal.aborted) {
            completed = true
            setState({ key, source })
          }
        })
        .catch(() => {
          if (!signal.aborted) completed = true
        })
    }
    const observer =
      typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((entries) => update(entries.some((item) => item.isIntersecting)))
    if (observer) observer.observe(ref.current)
    else update(true)
    return () => {
      observer?.disconnect()
      controller?.abort()
    }
  }, [key, supported, path, name, size, modified])
  return { ref, key, source: state?.key === key ? state.source : null }
}
