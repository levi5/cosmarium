import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { filesystem } from '../../services/tauri/filesystem'
import { FileIcon } from '.'

vi.mock('@tauri-apps/api/core', () => ({ convertFileSrc: (path: string) => `asset://${path}` }))
vi.mock('../../services/tauri/filesystem', () => ({ filesystem: { prepareMediaPreview: vi.fn() } }))

beforeEach(() => vi.mocked(filesystem.prepareMediaPreview).mockReset())
afterEach(cleanup)

const image = { name: 'photo.webp', path: '/photo.webp', kind: 'file' as const, size: 12, modified: null, accessed: null, hidden: false }

it('authorizes image thumbnails before assigning their source', async () => {
  let authorize!: (path: string) => void
  vi.mocked(filesystem.prepareMediaPreview).mockReturnValueOnce(
    new Promise((resolve) => {
      authorize = resolve
    })
  )
  const { container } = render(<FileIcon entry={image} />)
  expect(container.querySelector('img')).toBeNull()
  await act(async () => authorize('/resolved/photo.webp'))
  expect(container.querySelector('img')?.getAttribute('src')).toBe('asset:///resolved/photo.webp')
  const thumbnail = container.querySelector('img')
  if (!thumbnail) throw new Error('Missing authorized thumbnail')
  fireEvent.error(thumbnail)
  expect(container.querySelector('img')).toBeNull()
  expect(container.querySelector('svg')).toBeTruthy()
})

it('keeps a file glyph when thumbnail authorization fails', async () => {
  vi.mocked(filesystem.prepareMediaPreview).mockRejectedValueOnce('Access denied')
  const { container } = render(<FileIcon entry={image} />)
  await waitFor(() => expect(filesystem.prepareMediaPreview).toHaveBeenCalledWith(image.path))
  expect(container.querySelector('img')).toBeNull()
  expect(container.querySelector('svg')).toBeTruthy()
})

it('does not authorize directories or ordinary document icons', () => {
  render(
    <>
      <FileIcon entry={{ name: 'pictures', kind: 'directory' }} />
      <FileIcon entry={{ ...image, name: 'note.txt', path: '/note.txt' }} />
    </>
  )
  expect(filesystem.prepareMediaPreview).not.toHaveBeenCalled()
})
