import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { filesystem } from '../../services/tauri/filesystem'
import { PreviewPane } from './index'

vi.mock('@tauri-apps/api/core', () => ({ convertFileSrc: (path: string) => `asset://${path}` }))
vi.mock('../../services/tauri/filesystem', () => ({
  filesystem: {
    readTextPreview: vi.fn().mockResolvedValue({ isText: false, text: '', truncated: false, size: 10 }),
    prepareMediaPreview: vi.fn()
  }
}))
beforeEach(() => {
  vi.mocked(filesystem.prepareMediaPreview).mockReset()
})
afterEach(cleanup)

it('shows the binary message instead of an endless loading state', async () => {
  render(
    <PreviewPane
      entry={{ name: 'binary.txt', path: '/binary.txt', size: 10, kind: 'file', modified: null, accessed: null, hidden: false }}
      type="text"
      language="en"
      title="Preview"
      labels={{ image: 'Image', video: 'Video', text: 'Text', loading: 'Loading', binary: 'Not text', truncated: 'Truncated', size: 'Size', close: 'Close' }}
      onClose={() => {}}
    />
  )
  expect(await screen.findByText('Not text')).toBeTruthy()
  expect(screen.queryByText('Loading')).toBeNull()
  expect(filesystem.prepareMediaPreview).not.toHaveBeenCalled()
})

const mediaProps = {
  entry: { name: 'image.png', path: '/image.png', size: 10, kind: 'file' as const, modified: null, accessed: null, hidden: false },
  language: 'en' as const,
  title: 'Preview',
  labels: { image: 'Image', video: 'Video', text: 'Text', loading: 'Loading', binary: 'Not text', truncated: 'Truncated', size: 'Size', close: 'Close' },
  onClose: () => {}
}

it('does not request an asset until the backend authorizes its canonical path', async () => {
  let authorize!: (path: string) => void
  vi.mocked(filesystem.prepareMediaPreview).mockReturnValueOnce(
    new Promise((resolve) => {
      authorize = resolve
    })
  )
  render(<PreviewPane {...mediaProps} type="image" />)
  expect(screen.queryByRole('img')).toBeNull()
  expect(screen.getByRole('status').textContent).toBe('Loading')
  await act(async () => authorize('/resolved/image.png'))
  expect((await screen.findByRole('img')).getAttribute('src')).toBe('asset:///resolved/image.png')
})

it('shows authorization failures without exposing a media source', async () => {
  vi.mocked(filesystem.prepareMediaPreview).mockRejectedValueOnce('Access denied')
  render(<PreviewPane {...mediaProps} type="image" />)
  expect((await screen.findByRole('alert')).textContent).toBe('Access denied')
  expect(screen.queryByRole('img')).toBeNull()
  expect(screen.queryByRole('status')).toBeNull()
})

it('ignores stale authorization responses after changing the preview target', async () => {
  let authorize!: (path: string) => void
  vi.mocked(filesystem.prepareMediaPreview)
    .mockReturnValueOnce(
      new Promise((resolve) => {
        authorize = resolve
      })
    )
    .mockResolvedValueOnce('/resolved/next.png')
  const { rerender } = render(<PreviewPane {...mediaProps} type="image" />)
  rerender(<PreviewPane {...mediaProps} entry={{ ...mediaProps.entry, path: '/next.png', name: 'next.png' }} type="image" />)
  await waitFor(() => expect(screen.getByRole('img').getAttribute('src')).toBe('asset:///resolved/next.png'))
  await act(async () => authorize('/resolved/image.png'))
  expect(screen.getByRole('img').getAttribute('src')).toBe('asset:///resolved/next.png')
})
