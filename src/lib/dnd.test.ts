import type { DragEvent } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { useTransferStore } from '../stores/transferStore'
import { clearDragPayload, endHtmlDrag, getDragPayload, isInternalDrag, nativeDropPayload, setDragPayload, startNativeDrag } from './dnd'

const native = vi.hoisted(() => ({ invoke: vi.fn(), onEnd: null as null | { onmessage: (result: boolean) => void } }))
vi.mock('@tauri-apps/api/core', () => ({
  invoke: native.invoke,
  Channel: class {
    onmessage = () => {}
    constructor() {
      native.onEnd = this
    }
  }
}))

function event() {
  const data = new Map<string, string>()
  return {
    ctrlKey: false,
    metaKey: false,
    preventDefault: vi.fn(),
    dataTransfer: {
      types: ['application/x-cosmarium'],
      getData: (type: string) => data.get(type) ?? '',
      setData: (type: string, value: string) => data.set(type, value)
    }
  } as unknown as DragEvent
}

afterEach(() => {
  clearDragPayload()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  useTransferStore.setState({ items: {}, dismissedIds: [], panelOpen: false })
})

it('rejects filesystem operations requested by an external drag', () => {
  const drag = event()
  drag.dataTransfer.setData('application/x-cosmarium', JSON.stringify({ paths: ['/private'], copy: false, token: 'forged' }))
  expect(isInternalDrag(drag)).toBe(false)
  expect(getDragPayload(drag)).toBeNull()
})

it('uses only the paths recorded by the application, not a modified payload', () => {
  const drag = event()
  setDragPayload(drag, ['/selected'])
  const payload = JSON.parse(drag.dataTransfer.getData('application/x-cosmarium'))
  payload.paths = ['/not-selected']
  drag.dataTransfer.setData('application/x-cosmarium', JSON.stringify(payload))
  expect(getDragPayload(drag)?.paths).toEqual(['/selected'])
  clearDragPayload()
  expect(getDragPayload(drag)).toBeNull()
})

it('exports native drags while retaining internal move intent only for the selected paths', async () => {
  vi.useFakeTimers()
  vi.stubGlobal('__TAURI_INTERNALS__', {})
  native.invoke.mockResolvedValue(undefined)
  const drag = event()
  setDragPayload(drag, ['/selected'])
  startNativeDrag(drag, ['/selected'])
  expect(drag.preventDefault).toHaveBeenCalled()
  expect(native.invoke).toHaveBeenCalledWith('start_file_drag', expect.objectContaining({ paths: ['/selected'], copy: false }))
  endHtmlDrag()
  expect(nativeDropPayload(['/selected'])).toEqual({ paths: ['/selected'], copy: false })
  expect(nativeDropPayload(['/external'])).toEqual({ paths: ['/external'], copy: false })
  native.onEnd?.onmessage(true)
  vi.advanceTimersByTime(250)
  expect(nativeDropPayload(['/selected']).copy).toBe(false)
})

it('reports native drag failures instead of swallowing them', async () => {
  vi.stubGlobal('__TAURI_INTERNALS__', {})
  native.invoke.mockRejectedValueOnce('Drag failed')
  const drag = event()
  setDragPayload(drag, ['/selected'])
  startNativeDrag(drag, ['/selected'])
  await Promise.resolve()
  expect(Object.values(useTransferStore.getState().items)[0]).toMatchObject({ finished: true, error: 'Drag failed' })
  expect(nativeDropPayload(['/selected']).copy).toBe(false)
})

it('requests a native copy only when the copy modifier is pressed', () => {
  vi.stubGlobal('__TAURI_INTERNALS__', {})
  native.invoke.mockResolvedValue(undefined)
  const drag = { ...event(), ctrlKey: true } as DragEvent
  setDragPayload(drag, ['/selected'])
  startNativeDrag(drag, ['/selected'])
  expect(native.invoke).toHaveBeenLastCalledWith('start_file_drag', expect.objectContaining({ paths: ['/selected'], copy: true }))
})
