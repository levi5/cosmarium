import type { FileEntry } from '../types/explorer'
import type { Tag } from './organizer'

export function fileRows(entries: FileEntry[], selectedPaths: string[], activePath: string | null, tagsOf: (path: string) => Tag[]) {
  const selected = new Set(selectedPaths)
  return entries.map((entry) => ({
    entry,
    tags: tagsOf(entry.path),
    isSelected: selected.has(entry.path),
    isActive: activePath === entry.path
  }))
}
