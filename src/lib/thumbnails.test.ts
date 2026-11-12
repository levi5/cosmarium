import { afterEach, expect, it, vi } from 'vitest'
import { filesystem } from '../services/tauri/filesystem'
import { requestThumbnail, supportsThumbnail } from './thumbnails'

const pdf = vi.hoisted(() => ({
  render: vi.fn().mockReturnValue({ promise: Promise.resolve() }),
  destroy: vi.fn().mockResolvedValue(undefined),
  getDocument: vi.fn()
}))
vi.mock('@tauri-apps/api/core', () => ({ convertFileSrc: (path: string) => `asset://${path}` }))
vi.mock('../services/tauri/filesystem', () => ({ filesystem: { prepareMediaPreview: vi.fn(async (path: string) => path) } }))
vi.mock('pdfjs-dist', () => ({ getDocument: pdf.getDocument, GlobalWorkerOptions: {} }))

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

function entry(name: string, modified = 1) {
  return { name, path: `/${name}`, kind: 'file' as const, size: 123, modified, accessed: null, hidden: false }
}

it('supports images, PDFs and videos, but not folders or office documents', () => {
  for (const name of ['image.png', 'report.PDF', 'movie.mp4', 'movie.webm']) expect(supportsThumbnail(entry(name))).toBe(true)
  expect(supportsThumbnail(entry('report.docx'))).toBe(false)
  expect(supportsThumbnail({ name: 'folder.pdf', kind: 'directory' })).toBe(false)
})

it('renders only the first PDF page, caches it and invalidates modified files', async () => {
  const getPage = vi
    .fn()
    .mockResolvedValue({ getViewport: ({ scale }: { scale: number }) => ({ width: 600 * scale, height: 800 * scale }), render: pdf.render })
  pdf.getDocument.mockReturnValue({ promise: Promise.resolve({ getPage }), destroy: pdf.destroy })
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,pdf')
  const signal = new AbortController().signal
  expect(await requestThumbnail(entry('cached.pdf'), signal)).toBe('data:image/jpeg;base64,pdf')
  expect(getPage).toHaveBeenCalledWith(1)
  const canvas = pdf.render.mock.calls[pdf.render.mock.calls.length - 1][0].canvas as HTMLCanvasElement
  expect([canvas.width, canvas.height]).toEqual([144, 192])
  const count = getPage.mock.calls.length
  await requestThumbnail(entry('cached.pdf'), signal)
  expect(getPage).toHaveBeenCalledTimes(count)
  await requestThumbnail(entry('cached.pdf', 2), signal)
  expect(getPage).toHaveBeenCalledTimes(count + 1)
  expect(pdf.destroy).toHaveBeenCalled()
})

it('captures a video frame and releases the decoder', async () => {
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
  const drawImage = vi.fn()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,video')
  const create = document.createElement.bind(document)
  let video: HTMLVideoElement | undefined
  vi.spyOn(document, 'createElement').mockImplementation((tag, options) => {
    const element = create(tag, options)
    if (tag === 'video') {
      video = element as HTMLVideoElement
      Object.defineProperties(video, { videoWidth: { value: 1920 }, videoHeight: { value: 1080 }, duration: { value: 10 } })
      queueMicrotask(() => {
        element.dispatchEvent(new Event('loadeddata'))
        element.dispatchEvent(new Event('seeked'))
      })
    }
    return element
  })
  expect(await requestThumbnail(entry('frame.mp4'), new AbortController().signal)).toBe('data:image/jpeg;base64,video')
  expect(drawImage).toHaveBeenCalled()
  expect(video?.getAttribute('src')).toBeNull()
})

it('limits authorization/generation to two jobs and removes cancelled queued jobs', async () => {
  let release!: (path: string) => void
  vi.mocked(filesystem.prepareMediaPreview).mockReturnValueOnce(
    new Promise((resolve) => {
      release = resolve
    })
  )
  let releaseSecond!: (path: string) => void
  vi.mocked(filesystem.prepareMediaPreview).mockReturnValueOnce(
    new Promise((resolve) => {
      releaseSecond = resolve
    })
  )
  const signal = new AbortController().signal
  const first = requestThumbnail(entry('queue1.png'), signal)
  const second = requestThumbnail(entry('queue2.png'), signal)
  const controller = new AbortController()
  const third = requestThumbnail(entry('queue3.png'), controller.signal)
  const rejected = expect(third).rejects.toBeTruthy()
  controller.abort()
  await rejected
  expect(filesystem.prepareMediaPreview).not.toHaveBeenCalledWith('/queue3.png')
  release('/queue1.png')
  releaseSecond('/queue2.png')
  await Promise.all([first, second])
})

it('times out videos that never load and frees their resources', async () => {
  vi.useFakeTimers()
  const load = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
  const request = requestThumbnail(entry('stuck.mp4'), new AbortController().signal)
  const rejected = expect(request).rejects.toThrow('Video thumbnail unavailable')
  await vi.advanceTimersByTimeAsync(15000)
  await rejected
  expect(load).toHaveBeenCalled()
})
