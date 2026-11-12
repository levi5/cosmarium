import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import * as thumbnails from '../../lib/thumbnails'
import { filesystem } from '../../services/tauri/filesystem'
import { FileIcon } from '.'

vi.mock('@tauri-apps/api/core', () => ({ convertFileSrc: (path: string) => `asset://${path}` }))
vi.mock('../../lib/preferences', () => ({ usePreferences: () => ({ language: 'pt-BR' }) }))
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

it('marks protected folders and files without marking writable entries', () => {
  const { getAllByRole } = render(
    <>
      <FileIcon entry={{ name: 'private', kind: 'directory', protected: true }} />
      <FileIcon entry={{ ...image, name: 'private.txt', protected: true }} />
      <FileIcon entry={{ name: 'public', kind: 'directory' }} />
    </>
  )
  expect(getAllByRole('img', { name: 'Acesso restrito ou somente leitura' })).toHaveLength(2)
})

it('waits until an icon is visible before authorizing its thumbnail', async () => {
  let notify!: IntersectionObserverCallback
  const disconnect = vi.fn()
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IntersectionObserverCallback) {
        notify = callback
      }
      observe = vi.fn()
      disconnect = disconnect
    }
  )
  try {
    vi.mocked(filesystem.prepareMediaPreview).mockResolvedValue('/visible.webp')
    const { container, unmount } = render(<FileIcon entry={{ ...image, path: '/visible.webp' }} />)
    expect(filesystem.prepareMediaPreview).not.toHaveBeenCalled()
    await act(async () => notify([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver))
    await waitFor(() => expect(container.querySelector('img')).not.toBeNull())
    unmount()
    expect(disconnect).toHaveBeenCalled()
  } finally {
    vi.unstubAllGlobals()
  }
})

it.each(['report.pdf', 'movie.mp4'])('displays the generated thumbnail for %s', async (name) => {
  const request = vi.spyOn(thumbnails, 'requestThumbnail').mockResolvedValue('data:image/jpeg;base64,thumb')
  try {
    const { container } = render(<FileIcon entry={{ ...image, name, path: `/${name}` }} />)
    await waitFor(() => expect(container.querySelector('img')?.getAttribute('src')).toBe('data:image/jpeg;base64,thumb'))
  } finally {
    request.mockRestore()
  }
})

it('cancels offscreen work and retries when the icon becomes visible again', async () => {
  let notify!: IntersectionObserverCallback
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IntersectionObserverCallback) {
        notify = callback
      }
      observe = vi.fn()
      disconnect = vi.fn()
    }
  )
  const request = vi.spyOn(thumbnails, 'requestThumbnail').mockImplementation(() => new Promise(() => {}))
  try {
    const { unmount } = render(<FileIcon entry={{ ...image, name: 'cancel.pdf', path: '/cancel.pdf' }} />)
    const visibility = (isIntersecting: boolean) => act(async () => notify([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver))
    await visibility(true)
    const firstSignal = request.mock.calls[0][1]
    await visibility(false)
    expect(firstSignal.aborted).toBe(true)
    await visibility(true)
    expect(request).toHaveBeenCalledTimes(2)
    const secondSignal = request.mock.calls[1][1]
    expect(secondSignal.aborted).toBe(false)
    unmount()
    expect(secondSignal.aborted).toBe(true)
  } finally {
    request.mockRestore()
    vi.unstubAllGlobals()
  }
})
