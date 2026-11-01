import type { DragEvent } from 'react'
import { afterEach, expect, it } from 'vitest'
import { clearDragPayload, getDragPayload, isInternalDrag, setDragPayload } from './dnd'

function event() {
  const data = new Map<string, string>()
  return {
    dataTransfer: {
      types: ['application/x-cosmarium'],
      getData: (type: string) => data.get(type) ?? '',
      setData: (type: string, value: string) => data.set(type, value)
    }
  } as unknown as DragEvent
}

afterEach(clearDragPayload)

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
