import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { useEffect, useRef, useState } from 'react'
import { errorMessage } from '../../lib/format'
import type { Language } from '../../lib/preferences'
import { IconButton } from '../base/IconButton'

GlobalWorkerOptions.workerSrc = workerUrl

export default function PdfPreview({ source, language }: { source: string; language: Language }) {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const labels =
    language === 'pt-BR'
      ? { previous: 'Página anterior', next: 'Próxima página', loading: 'Carregando PDF…' }
      : { previous: 'Previous page', next: 'Next page', loading: 'Loading PDF…' }
  useEffect(() => {
    let alive = true
    setDocument(null)
    setPageNumber(1)
    setError(null)
    const task = getDocument({ url: source })
    task.promise
      .then((pdf) => {
        if (alive) setDocument(pdf)
      })
      .catch((reason) => {
        if (alive) setError(errorMessage(reason))
      })
    return () => {
      alive = false
      void task.destroy()
    }
  }, [source])
  useEffect(() => {
    if (!document || !canvasRef.current) return
    let cancelled = false
    let cancelRender: (() => void) | undefined
    document
      .getPage(pageNumber)
      .then((page) => {
        const canvas = canvasRef.current
        if (cancelled || !canvas) return
        const base = page.getViewport({ scale: 1 })
        const scale = Math.min(Math.min(window.devicePixelRatio || 1, 2) * 1.2, 4096 / Math.max(base.width, base.height))
        const viewport = page.getViewport({ scale })
        canvas.width = viewport.width
        canvas.height = viewport.height
        const task = page.render({ canvas, viewport })
        cancelRender = () => task.cancel()
        return task.promise
      })
      .catch((reason) => {
        if (!cancelled) setError(errorMessage(reason))
      })
    return () => {
      cancelled = true
      cancelRender?.()
    }
  }, [document, pageNumber])
  return (
    <div className="pdf-preview">
      {error ? (
        <p role="alert">{error}</p>
      ) : !document ? (
        <p role="status">{labels.loading}</p>
      ) : (
        <nav aria-label="PDF">
          <IconButton icon="back" label={labels.previous} disabled={pageNumber <= 1} onClick={() => setPageNumber(pageNumber - 1)} />
          <span>
            {pageNumber} / {document.numPages}
          </span>
          <IconButton icon="arrow" label={labels.next} disabled={pageNumber >= document.numPages} onClick={() => setPageNumber(pageNumber + 1)} />
        </nav>
      )}
      <canvas ref={canvasRef} aria-label={`PDF ${pageNumber}`} style={{ maxWidth: '100%', height: 'auto' }} />
    </div>
  )
}
