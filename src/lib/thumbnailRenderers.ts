const EDGE = 192

function canvasFor(width: number, height: number) {
  if (!width || !height) throw new Error('Empty thumbnail')
  const canvas = document.createElement('canvas')
  const scale = Math.min(1, EDGE / Math.max(width, height))
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  return canvas
}

export async function pdfThumbnail(source: string, signal: AbortSignal) {
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
    await page.render({ canvas, viewport: page.getViewport({ scale: canvas.width / base.width }) }).promise
    signal.throwIfAborted()
    return canvas.toDataURL('image/jpeg', 0.8)
  } finally {
    signal.removeEventListener('abort', abort)
    await task.destroy()
  }
}

export function videoThumbnail(source: string, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true
    const holder = document.createElement('div')
    holder.style.cssText = 'position:fixed;left:-10000px;top:0;width:192px;height:108px;pointer-events:none'
    holder.setAttribute('aria-hidden', 'true')
    holder.appendChild(video)
    document.body.appendChild(holder)
    const cleanup = () => {
      signal.removeEventListener('abort', fail)
      video.onloadeddata = null
      video.onseeked = null
      video.onerror = null
      video.removeAttribute('src')
      video.load()
      holder.remove()
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
    else {
      video.src = source
      video.load()
    }
  })
}
