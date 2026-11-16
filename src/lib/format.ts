import { fileExtension, PREVIEWABLE_EXTENSIONS, TEXT_PREVIEWABLE_EXTENSIONS } from '../constants/files'
import type { FileEntry } from '../types/explorer'
import { formatSize } from './formatters'

export { formatDate, formatSize } from './formatters'

export type PreviewType = 'image' | 'video' | 'text' | 'audio' | 'pdf'

export const TEXT_PREVIEW_MAX_SIZE = 2 * 1024 * 1024

const VIEWPORT_MARGIN_PX = 8

export function clampToViewport(coordinate: number, elementSize: number, viewportSize: number): number {
  const maximum = viewportSize - elementSize - VIEWPORT_MARGIN_PX
  return Math.max(VIEWPORT_MARGIN_PX, Math.min(coordinate, maximum))
}

export function errorMessage(reason: unknown): string {
  if (typeof reason === 'string') return reason
  if (reason instanceof Error) return reason.message
  return String(reason)
}

export function previewType(entry: FileEntry): PreviewType | null {
  if (entry.kind === 'directory') return null
  const extension = fileExtension(entry.name)
  if (extension === 'pdf') return 'pdf'
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'opus'].includes(extension)) return 'audio'
  if ((PREVIEWABLE_EXTENSIONS as readonly string[]).includes(extension)) {
    return (['m4v', 'mov', 'mp4', 'ogv', 'webm'] as readonly string[]).includes(extension) ? 'video' : 'image'
  }
  const isText = (TEXT_PREVIEWABLE_EXTENSIONS as readonly string[]).includes(extension)
  return isText && entry.size <= TEXT_PREVIEW_MAX_SIZE ? 'text' : null
}

export function entryType(entry: FileEntry, folderLabel: string, fileLabel: string, fileTypeLabel: string): string {
  if (entry.kind === 'directory') return folderLabel
  const extension = fileExtension(entry.name)
  if (!extension) return fileLabel
  return fileTypeLabel.replace('{ext}', extension.toUpperCase())
}

export function sizeLabel(entry: FileEntry, folderSizes: Record<string, number>, language: string): string {
  if (entry.kind !== 'directory') return formatSize(entry.size, language)
  const size = folderSizes[entry.path]
  return size === undefined ? '' : formatSize(size, language)
}

export function parentPath(path: string): string {
  const separator = path.includes('\\') ? '\\' : '/'
  return path.split(/[\\/]/).slice(0, -1).join(separator) || path
}

export function lastSegment(path: string, fallback: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() || fallback
}

export function joinPath(directory: string, name: string): string {
  if (!directory) return name
  const trimmed = directory.replace(/[\\/]+$/, '')
  const separator = trimmed.includes('\\') ? '\\' : '/'
  return `${trimmed}${separator}${name}`
}

export async function copyText(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value)
    return
  } catch {
    const area = document.createElement('textarea')
    area.value = value
    document.body.appendChild(area)
    area.select()
    try {
      document.execCommand('copy')
    } catch {
      return
    }
    area.remove()
  }
}
