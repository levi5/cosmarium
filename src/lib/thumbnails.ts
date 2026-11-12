import { convertFileSrc } from '@tauri-apps/api/core'
import { fileExtension, hasExtension, IMAGE_EXTENSIONS, VIDEO_EXTENSIONS } from '../constants/files'
import { filesystem } from '../services/tauri/filesystem'
import type { FileEntry } from '../types/explorer'

const EDGE = 192
const CACHE_LIMIT = 200
const cache = new Map<string, string>()
const queue: Array<() => void> = []
let active = 0

export function thumbnailKey(entry: FileEntry) {
  return JSON.stringify([entry.path, entry.name, entry.size, entry.modified])
}

export function supportsThumbnail(entry: Pick<FileEntry, 'name' | 'kind'>) {
  return (
    entry.kind === 'file' && (hasExtension(entry.name, IMAGE_EXTENSIONS) || hasExtension(entry.name, VIDEO_EXTENSIONS) || fileExtension(entry.name) === 'pdf')
  )
}

function canvasFor(width: number, height: number) {
  if (!width || !height) throw new Error('Empty thumbnail')
  const canvas = document.createElement('canvas')
  const scale = EDGE / Math.max(width, height)
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  return canvas
}

async function pdfThumbnail(source: string, signal: AbortSignal) {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  signal.throwIfAborted()
  GlobalWorkerOptions.workerSrc = workerUrl
  const task = getDocument({ url: source })
  const abort = () => {
    void task.destroy()
  }
  signal.addEventListener('abort', abort, { once: true })
  try {
    const pdf = await task.promise
    const page = await pdf.getPage(1)
    signal.throwIfAborted()
    const base = page.getViewport({ scale: 1 })
    const canvas = canvasFor(base.width, base.height)
    await page.render({ canvas, viewport: page.getViewport({ scale: EDGE / Math.max(base.width, base.height) }) }).promise
    signal.throwIfAborted()
    return canvas.toDataURL('image/jpeg', 0.8)
  } finally {
    signal.removeEventListener('abort', abort)
    await task.destroy()
  }
}

function videoThumbnail(source: string, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true
    const cleanup = () => {
      signal.removeEventListener('abort', fail)
      video.onloadeddata = null
      video.onseeked = null
      video.onerror = null
      video.removeAttribute('src')
      video.load()
    }
    const fail = () => {
      cleanup()
      reject(new Error('Video thumbnail unavailable'))
    }
    const capture = () => {
      try {
        signal.throwIfAborted()
        const canvas = canvasFor(video.videoWidth, video.videoHeight)
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Canvas unavailable')
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        const result = canvas.toDataURL('image/jpeg', 0.8)
        cleanup()
        resolve(result)
      } catch {
        fail()
      }
    }
    video.onloadeddata = () => {
      const time = Number.isFinite(video.duration) ? Math.min(1, video.duration / 4) : 0
      if (time > 0) video.currentTime = time
      else capture()
    }
    video.onseeked = capture
    video.onerror = fail
    signal.addEventListener('abort', fail, { once: true })
    if (signal.aborted) fail()
    else video.src = source
  })
}

// Limit decoders to two at a time; offscreen/unmounted requests are cancelled.
export function requestThumbnail(entry: FileEntry, signal: AbortSignal): Promise<string> {
  const key = thumbnailKey(entry)
  const cached = cache.get(key)
  if (cached) {
    cache.delete(key)
    cache.set(key, cached)
    return Promise.resolve(cached)
  }
  return new Promise((resolve, reject) => {
    const run = () => {
      if (signal.aborted) {
        reject(signal.reason)
        drain()
        return
      }
      active++
      const controller = new AbortController()
      const abort = () => controller.abort()
      signal.addEventListener('abort', abort, { once: true })
      const timer = setTimeout(abort, 15000)
      const generate = async () => {
        const source = convertFileSrc(await filesystem.prepareMediaPreview(entry.path))
        controller.signal.throwIfAborted()
        if (hasExtension(entry.name, IMAGE_EXTENSIONS)) return source
        const result = await (fileExtension(entry.name) === 'pdf' ? pdfThumbnail(source, controller.signal) : videoThumbnail(source, controller.signal))
        controller.signal.throwIfAborted()
        cache.set(key, result)
        if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value as string)
        return result
      }
      void generate()
        .then(resolve, reject)
        .finally(() => {
          clearTimeout(timer)
          signal.removeEventListener('abort', abort)
          active--
          drain()
        })
    }
    const cancelQueued = () => {
      const index = queue.indexOf(start)
      if (index >= 0) {
        queue.splice(index, 1)
        reject(signal.reason)
      }
    }
    const start = () => {
      signal.removeEventListener('abort', cancelQueued)
      run()
    }
    signal.addEventListener('abort', cancelQueued, { once: true })
    queue.push(start)
    drain()
  })
}

function drain() {
  while (active < 2 && queue.length) queue.shift()?.()
}
