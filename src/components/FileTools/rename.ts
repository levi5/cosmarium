import type { FileEntry } from '../../types/explorer'
import type { RenameItem } from './api'

export type RenameOptions = { find: string; replace: string; prefix: string; number: boolean }

export function planRename(entries: FileEntry[], options: RenameOptions): RenameItem[] {
  return entries.map((entry, index) => {
    const replaced = options.find ? entry.name.split(options.find).join(options.replace) : entry.name
    const prefix = `${options.prefix}${options.number ? `${String(index + 1).padStart(String(entries.length).length, '0')}-` : ''}`
    return { path: entry.path, newName: `${prefix}${replaced}` }
  })
}

export function validRenamePlan(items: RenameItem[]): boolean {
  const names = items.map((item) => item.newName.trim())
  return (
    names.length > 0 && names.every((name) => name.length > 0 && name !== '.' && name !== '..' && !/[/\\\0]/.test(name)) && new Set(names).size === names.length
  )
}
