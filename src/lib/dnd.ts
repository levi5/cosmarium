import { Channel, invoke } from '@tauri-apps/api/core'
import { useTransferStore } from '../stores/transferStore'

const MIME = 'application/x-cosmarium'
let activeDrag: { token: string; payload: DragPayload; native?: boolean } | null = null

export type DragPayload = {
  paths: string[]
  copy: boolean
}

export function setDragPayload(event: React.DragEvent, paths: string[]): void {
  const copy = event.ctrlKey || event.metaKey
  const payload: DragPayload = { paths, copy }
  activeDrag = { token: crypto.randomUUID(), payload: { paths: [...paths], copy } }
  event.dataTransfer.effectAllowed = copy ? 'copyMove' : 'move'
  event.dataTransfer.setData(MIME, JSON.stringify({ ...payload, token: activeDrag.token }))
  event.dataTransfer.setData('text/plain', paths.join('\n'))
  event.dataTransfer.setData('application/x-cosmarium-count', String(paths.length))
}

export function getDragPayload(event: React.DragEvent): DragPayload | null {
  const raw = event.dataTransfer.getData(MIME)
  if (!raw || !activeDrag || raw.length > 1024 * 1024) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !('token' in parsed) || parsed.token !== activeDrag.token) return null
    return { paths: [...activeDrag.payload.paths], copy: activeDrag.payload.copy }
  } catch {
    return null
  }
}

export function clearDragPayload(): void {
  activeDrag = null
}

export function endHtmlDrag(): void {
  if (!activeDrag?.native) clearDragPayload()
}

export function nativeDropPayload(paths: string[]): DragPayload {
  if (activeDrag?.native && paths.length === activeDrag.payload.paths.length && paths.every((path, index) => path === activeDrag?.payload.paths[index])) {
    return { paths: [...paths], copy: activeDrag.payload.copy }
  }
  return { paths: [...paths], copy: false }
}

export function startNativeDrag(event: React.DragEvent, paths: string[]): void {
  if (!('__TAURI_INTERNALS__' in window) || !activeDrag) return
  event.preventDefault()
  activeDrag.native = true
  const token = activeDrag.token
  const clear = () => {
    if (activeDrag?.token === token) clearDragPayload()
  }
  const onEnd = new Channel<boolean>()
  onEnd.onmessage = () => window.setTimeout(clear, 250)
  void invoke('start_file_drag', { paths, copy: activeDrag.payload.copy, onEnd }).catch((reason) => {
    clear()
    reportDragFailure(reason)
  })
}

export function reportDragFailure(reason: unknown): void {
  useTransferStore.getState().receive({
    id: `drag-${crypto.randomUUID()}`,
    cut: false,
    kind: 'copy',
    done_files: 0,
    total_files: 0,
    done_bytes: 0,
    total_bytes: 0,
    finished: true,
    error: String(reason)
  })
}

export function markDropTarget(event: React.DragEvent, active: boolean): void {
  if (active) {
    event.dataTransfer.dropEffect = event.ctrlKey || event.metaKey ? 'copy' : 'move'
  }
}

export function isInternalDrag(event: React.DragEvent): boolean {
  return activeDrag !== null && Array.from(event.dataTransfer.types).includes(MIME)
}
