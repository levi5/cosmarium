const MIME = 'application/x-cosmarium'
let activeDrag: { token: string; payload: DragPayload } | null = null

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

export function markDropTarget(event: React.DragEvent, active: boolean): void {
  if (active) {
    event.dataTransfer.dropEffect = event.ctrlKey || event.metaKey ? 'copy' : 'move'
  }
}

export function isInternalDrag(event: React.DragEvent): boolean {
  return activeDrag !== null && Array.from(event.dataTransfer.types).includes(MIME)
}
