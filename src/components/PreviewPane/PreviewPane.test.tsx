import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { PreviewPane } from './index'

vi.mock('@tauri-apps/api/core', () => ({ convertFileSrc: () => 'asset://file' }))
vi.mock('../../services/tauri/filesystem', () => ({
  filesystem: { readTextPreview: vi.fn().mockResolvedValue({ isText: false, text: '', truncated: false, size: 10 }) }
}))
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
})
