import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { filesystem } from '../../services/tauri/filesystem'
import type { FileEntry } from '../../types/explorer'
import { DetailsPane } from '.'

vi.mock('../../services/tauri/filesystem', () => ({
  filesystem: { readTextPreview: vi.fn(), getFolderStats: vi.fn() }
}))
vi.mock('../FileIcon', () => ({ FileIcon: () => null }))
const file: FileEntry = { path: '/docs/note.txt', name: 'note.txt', kind: 'file', size: 12, hidden: false, accessed: null, modified: null }
const props = {
  entry: file,
  folderSizes: {},
  tags: [],
  language: 'en' as const,
  folderLabel: 'Folder',
  fileLabel: 'File',
  fileTypeLabel: '{ext} file',
  onUnassign: vi.fn(),
  onClose: vi.fn()
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(filesystem.readTextPreview).mockResolvedValue({ isText: true, text: 'Hello world', truncated: false, size: 12 })
  vi.mocked(filesystem.getFolderStats).mockResolvedValue({ files: 2, dirs: 3, size: 1024, truncated: false })
})
afterEach(cleanup)

it('keeps an enabled pane visible without selection and provides a working close action', () => {
  render(<DetailsPane {...props} entry={null} />)
  expect(screen.getByRole('complementary', { name: 'Details pane' })).toBeTruthy()
  expect(screen.getByText('Select a file or folder to see its details.')).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Copy path' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Close pane' }))
  expect(props.onClose).toHaveBeenCalledOnce()
  expect(filesystem.readTextPreview).not.toHaveBeenCalled()
})

it('labels the content preview correctly and shows the full file path', async () => {
  render(<DetailsPane {...props} />)
  await screen.findByText('Hello world')
  expect(screen.getByRole('heading', { name: 'Text preview' })).toBeTruthy()
  expect(screen.getByText('/docs/note.txt')).toBeTruthy()
})

it('shows folder size once and includes subfolders in the item count', async () => {
  render(<DetailsPane {...props} entry={{ ...file, kind: 'directory' }} />)
  await screen.findByText('5 items')
  expect(screen.getAllByText('Size')).toHaveLength(1)
  expect(filesystem.readTextPreview).not.toHaveBeenCalled()
})

it('clears old content when selection changes', async () => {
  const { rerender } = render(<DetailsPane {...props} />)
  await screen.findByText('Hello world')
  rerender(<DetailsPane {...props} entry={null} />)
  expect(screen.queryByText('Hello world')).toBeNull()
  await waitFor(() => expect(screen.getByText('Select a file or folder to see its details.')).toBeTruthy())
})

it('gives tag removal an explicit action label', async () => {
  render(<DetailsPane {...props} tags={[{ id: 'work', name: 'Work', emoji: '⭐', color: '#ff0000' }]} />)
  fireEvent.click(screen.getByRole('button', { name: 'Remove tag: Work' }))
  expect(props.onUnassign).toHaveBeenCalledWith(file, 'work')
  await screen.findByText('Hello world')
})
