import { invoke } from '@tauri-apps/api/core'
import type { FileEntry } from '../../types/explorer'

export type RenameItem = { path: string; newName: string }
export type DuplicateGroup = { size: number; paths: string[] }

export const toolsApi = {
  openTerminal: (path: string) => invoke<void>('open_terminal', { path }),
  compress: (sources: string[], destination: string, name: string) => invoke<string>('compress_zip', { sources, destination, name }),
  extract: (source: string, destination: string, name: string) => invoke<string>('extract_zip', { source, destination, name }),
  rename: (items: RenameItem[]) => invoke<FileEntry[]>('batch_rename', { items }),
  duplicates: (root: string) => invoke<DuplicateGroup[]>('find_duplicates', { root })
}
