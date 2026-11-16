import { fileExtension, hasExtension, IMAGE_EXTENSIONS, VIDEO_EXTENSIONS } from '../constants/files'
import { filesystem } from '../services/tauri/filesystem'
import type { FileEntry } from '../types/explorer'
import { pdfThumbnail, videoThumbnail } from './thumbnailRenderers'

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

export function requestThumbnail(entry: FileEntry, signal: AbortSignal): Promise<string> {
  if (signal.aborted) return Promise.reject(signal.reason)
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
