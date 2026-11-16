import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { FileTable, type FileRowModel } from './FileTable'

vi.mock('../FileIcon', () => ({ FileIcon: () => null }))

let resize: ResizeObserverCallback
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        resize = callback
      }
      observe() {}
      disconnect() {}
    }
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const rows: FileRowModel[] = Array.from({ length: 20000 }, (_, index) => ({
  entry: { path: `/large/${index}.txt`, name: `${index}.txt`, kind: 'file', size: 10, modified: null, accessed: null, hidden: false },
  tags: [],
  isSelected: false,
  isActive: false
}))

const props = {
  rows,
  iconSize: 'small' as const,
  language: 'en',
  labels: { name: 'Name', modified: 'Modified', accessed: 'Accessed', type: 'Type', size: 'Size', file: 'File', fileType: '{ext} file' },
  folderLabel: 'Folder',
  showSize: true,
  folderSizes: {},
  currentPath: '/large',
  selectedPaths: [],
  activePath: null,
  onDrop: vi.fn(),
  onSelect: vi.fn(),
  onSelectPaths: vi.fn(),
  onFocusEntry: vi.fn(),
  onOpen: vi.fn(),
  onContextMenu: vi.fn(),
  onUnassign: vi.fn(),
  onBackgroundMenu: vi.fn()
}

it.each(['list', 'details', 'compact'] as const)('keeps 20,000 entries bounded in %s view, including after scrolling and filtering', (view) => {
  const { container, getByRole, rerender } = render(<FileTable {...props} view={view} />)
  expect(container.querySelectorAll('[role="option"]').length).toBeLessThan(30)
  const list = getByRole('listbox')
  Object.defineProperty(list, 'clientHeight', { value: 420 })
  act(() => resize([], {} as ResizeObserver))
  list.scrollTop = 19000 * 42
  fireEvent.scroll(list)
  expect(container.querySelectorAll('[role="option"]').length).toBeLessThan(40)
  expect(Number(container.querySelector('[role="option"]')?.getAttribute('data-row-index'))).toBeGreaterThan(18000)

  rerender(<FileTable {...props} rows={rows.slice(0, 3)} view={view} />)
  expect(container.querySelectorAll('[role="option"]')).toHaveLength(3)
  expect(container.querySelector('[role="option"]')?.getAttribute('data-row-index')).toBe('0')
})

it('focuses the final entry after keyboard navigation scrolls a virtualized list', () => {
  const { getByRole, container } = render(<FileTable {...props} view="list" />)
  const list = getByRole('listbox')
  Object.defineProperty(list, 'clientHeight', { value: 420 })
  act(() => resize([], {} as ResizeObserver))
  fireEvent.keyDown(list, { key: 'End' })
  fireEvent.scroll(list)
  const last = container.querySelector('[data-row-index="19999"]')
  expect(last).not.toBeNull()
  expect(document.activeElement).toBe(last)
  expect(props.onSelectPaths).toHaveBeenCalledWith(['/large/19999.txt'])
})
