import { invoke } from '@tauri-apps/api/core'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { useEffect } from 'react'
import { nativeDropPayload, reportDragFailure } from '../lib/dnd'
import { usePendingDropStore } from '../stores/pendingDropStore'

export function nativeDropTarget(x: number, y: number): HTMLElement | null {
  if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return null
  return document.elementFromPoint(x / window.devicePixelRatio, y / window.devicePixelRatio)?.closest<HTMLElement>('[data-native-drop-path]') ?? null
}

export function useNativeFileDrop() {
  const request = usePendingDropStore((state) => state.request)
  useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window)) return
    let alive = true
    let off: (() => void) | undefined
    let highlighted: HTMLElement | null = null
    const clear = () => {
      highlighted?.classList.remove('is-native-drop-target')
      highlighted = null
    }
    getCurrentWebview()
      .onDragDropEvent(({ payload }) => {
        if (!alive) return
        clear()
        if (payload.type === 'leave') return
        const target = nativeDropTarget(payload.position.x, payload.position.y)
        const dest = target?.dataset.nativeDropPath
        if (!dest) return
        if (payload.type === 'drop') {
          const drag = nativeDropPayload(payload.paths)
          if (!drag.paths.length || drag.paths.includes(dest)) return
          void invoke<boolean>('drag_copy_modifier')
            .then((copy) => {
              if (alive) request({ paths: drag.paths, dest, cut: !(copy || drag.copy) })
            })
            .catch((reason) => {
              if (alive) reportDragFailure(reason)
            })
        } else {
          highlighted = target
          highlighted?.classList.add('is-native-drop-target')
        }
      })
      .then((unlisten) => {
        if (alive) off = unlisten
        else unlisten()
      })
      .catch((reason) => {
        if (alive) reportDragFailure(reason)
      })
    return () => {
      alive = false
      off?.()
      clear()
    }
  }, [request])
}
