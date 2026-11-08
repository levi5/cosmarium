import { PhysicalPosition } from '@tauri-apps/api/dpi'
import type { EventCallback } from '@tauri-apps/api/event'
import type { DragDropEvent } from '@tauri-apps/api/webview'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { usePendingDropStore } from '../stores/pendingDropStore'
import { nativeDropTarget, useNativeFileDrop } from './useNativeFileDrop'

const native = vi.hoisted(() => ({ listen: vi.fn(), off: vi.fn(), invoke: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: native.invoke }))
vi.mock('@tauri-apps/api/webview', () => ({ getCurrentWebview: () => ({ onDragDropEvent: native.listen }) }))
let handler: EventCallback<DragDropEvent>

beforeEach(() => {
  vi.stubGlobal('__TAURI_INTERNALS__', {})
  vi.stubGlobal('devicePixelRatio', 2)
  native.listen.mockImplementation(async (callback: EventCallback<DragDropEvent>) => {
    handler = callback
    return native.off
  })
  usePendingDropStore.getState().clear()
  native.invoke.mockResolvedValue(false)
})
afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function emit(payload: DragDropEvent) {
  act(() => handler({ event: 'tauri://drag-drop', id: 1, payload }))
}

it('moves native file drops to the hovered folder using scaled coordinates', async () => {
  document.body.innerHTML = '<div data-native-drop-path="/parent"><div data-native-drop-path="/folder"><span>folder</span></div></div>'
  const hit = vi.fn().mockReturnValue(document.querySelector('span'))
  Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: hit })
  await act(async () => {
    renderHook(useNativeFileDrop)
  })
  emit({ type: 'over', position: new PhysicalPosition(100, 80) })
  expect(document.querySelector('.is-native-drop-target')?.getAttribute('data-native-drop-path')).toBe('/folder')
  await act(async () => emit({ type: 'drop', paths: ['/Desktop/file.txt'], position: new PhysicalPosition(100, 80) }))
  expect(hit).toHaveBeenCalledWith(50, 40)
  expect(usePendingDropStore.getState().drop).toEqual({ paths: ['/Desktop/file.txt'], dest: '/folder', cut: true })
  expect(document.querySelector('.is-native-drop-target')).toBeNull()
})

it('copies desktop drops when the native copy modifier is held', async () => {
  native.invoke.mockResolvedValue(true)
  document.body.innerHTML = '<div data-native-drop-path="/folder"></div>'
  Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: vi.fn().mockReturnValue(document.querySelector('div')) })
  await act(async () => {
    renderHook(useNativeFileDrop)
  })
  await act(async () => emit({ type: 'drop', paths: ['/Desktop/file.txt'], position: new PhysicalPosition(0, 0) }))
  expect(native.invoke).toHaveBeenCalledWith('drag_copy_modifier')
  expect(usePendingDropStore.getState().drop).toEqual({ paths: ['/Desktop/file.txt'], dest: '/folder', cut: false })
})

it('does not move files if native modifier detection fails', async () => {
  native.invoke.mockRejectedValueOnce('Keyboard state unavailable')
  document.body.innerHTML = '<div data-native-drop-path="/folder"></div>'
  Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: vi.fn().mockReturnValue(document.querySelector('div')) })
  await act(async () => {
    renderHook(useNativeFileDrop)
  })
  await act(async () => emit({ type: 'drop', paths: ['/Desktop/file.txt'], position: new PhysicalPosition(0, 0) }))
  expect(usePendingDropStore.getState().drop).toBeNull()
})

it('blocks native drops while a dialog is open and ignores non-folder UI', () => {
  document.body.innerHTML = '<div data-native-drop-path="/folder"></div><section role="dialog"></section>'
  Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: vi.fn().mockReturnValue(document.querySelector('div')) })
  expect(nativeDropTarget(0, 0)).toBeNull()
  document.body.innerHTML = '<button>Settings</button>'
  Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: vi.fn().mockReturnValue(document.querySelector('button')) })
  expect(nativeDropTarget(0, 0)).toBeNull()
})

it('removes native listeners on unmount', async () => {
  let unmount!: () => void
  await act(async () => {
    unmount = renderHook(useNativeFileDrop).unmount
  })
  unmount()
  expect(native.off).toHaveBeenCalled()
})
