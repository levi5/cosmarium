import { fileExtension, hasExtension, IMAGE_EXTENSIONS, VIDEO_EXTENSIONS } from '../constants/files'
import { filesystem } from '../services/tauri/filesystem'
import type { FileEntry } from '../types/explorer'
import { pdfThumbnail, videoThumbnail } from './thumbnailRenderers'

const CACHE_LIMIT = 200
const cache = new Map<string, string>()
const queue: Array<() => void> = []
let active = 0
type ThumbnailJob = { controller: AbortController; promise: Promise<string>; consumers: number }
const inFlight = new Map<string, ThumbnailJob>()

export function thumbnailKey(entry: FileEntry) {
  return JSON.stringify([entry.path, entry.name, entry.size, entry.modified])
}

export function supportsThumbnail(entry: Pick<FileEntry, 'name' | 'kind'>) {
  return (
    entry.kind === 'file' && (hasExtension(entry.name, IMAGE_EXTENSIONS) || hasExtension(entry.name, VIDEO_EXTENSIONS) || fileExtension(entry.name) === 'pdf')
  )
}

export function requestThumbnail(entry: FileEntry, signal: AbortSignal): Promise<string> {
  if (signal.aborted) return Promise.reject(signal.reason)
  const key = thumbnailKey(entry)
  const cached = cache.get(key)
  if (cached) {
    cache.delete(key)
    cache.set(key, cached)
    return Promise.resolve(cached)
  }
  let job = inFlight.get(key)
  if (!job) {
    const controller = new AbortController()
    job = { controller, promise: generateThumbnail(entry, key, controller.signal), consumers: 0 }
    inFlight.set(key, job)
    const current = job
    const remove = () => {
      if (inFlight.get(key) === current) inFlight.delete(key)
    }
    void job.promise.then(remove, remove)
  }
  const current = job
  current.consumers++
  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (callback: () => void) => {
      if (settled) return
      settled = true
      signal.removeEventListener('abort', abort)
      current.consumers--
      callback()
    }
    const abort = () => {
      finish(() => reject(signal.reason))
      if (current.consumers === 0) {
        if (inFlight.get(key) === current) inFlight.delete(key)
        current.controller.abort(signal.reason)
      }
    }
    signal.addEventListener('abort', abort, { once: true })
    void current.promise.then(
      (source) => finish(() => resolve(source)),
      (reason) => finish(() => reject(reason))
    )
  })
}

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      signal.removeEventListener('abort', abort)
      reject(signal.reason)
    }
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) abort()
    void promise.then(
      (value) => {
        signal.removeEventListener('abort', abort)
        resolve(value)
      },
      (reason) => {
        signal.removeEventListener('abort', abort)
        reject(reason)
      }
    )
  })
}

function generateThumbnail(entry: FileEntry, key: string, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const run = () => {
      if (signal.aborted) {
        reject(signal.reason)
        drain()
        return
      }
      active++
      const controller = new AbortController()
      const abort = () => controller.abort(signal.reason)
      signal.addEventListener('abort', abort, { once: true })
      const timer = setTimeout(() => controller.abort(new DOMException('Thumbnail timed out', 'TimeoutError')), 15000)
      const generate = async () => {
        const source = await filesystem.prepareMediaPreview(entry.path)
        controller.signal.throwIfAborted()
        const result = hasExtension(entry.name, IMAGE_EXTENSIONS)
          ? source
          : await (fileExtension(entry.name) === 'pdf' ? pdfThumbnail(source, controller.signal) : videoThumbnail(source, controller.signal))
        controller.signal.throwIfAborted()
        cache.set(key, result)
        if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value as string)
        return result
      }
      void abortable(generate(), controller.signal)
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
