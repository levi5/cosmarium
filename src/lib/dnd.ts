const MIME = 'application/x-cosmarium'

export type DragPayload = {
  paths: string[]
  copy: boolean
}

export function setDragPayload(event: React.DragEvent, paths: string[]): void {
  const copy = event.ctrlKey || event.metaKey
  const payload: DragPayload = { paths, copy }
  event.dataTransfer.effectAllowed = copy ? 'copyMove' : 'move'
  event.dataTransfer.setData(MIME, JSON.stringify(payload))
  event.dataTransfer.setData('text/plain', paths.join('\n'))
  event.dataTransfer.setData('application/x-cosmarium-count', String(paths.length))
}

export function getDragPayload(event: React.DragEvent): DragPayload | null {
  const raw = event.dataTransfer.getData(MIME)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as DragPayload
    if (!Array.isArray(parsed.paths) || parsed.paths.length === 0) return null
    return { paths: parsed.paths, copy: Boolean(parsed.copy) }
  } catch {
    return null
  }
}

export function markDropTarget(event: React.DragEvent, active: boolean): void {
  if (active) {
    event.dataTransfer.dropEffect = event.ctrlKey || event.metaKey ? 'copy' : 'move'
  }
}

export function isInternalDrag(event: React.DragEvent): boolean {
  return Array.from(event.dataTransfer.types).includes(MIME)
}
