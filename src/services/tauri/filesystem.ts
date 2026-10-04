import { invoke } from '@tauri-apps/api/core'
import type {
  ConflictResolution,
  FileEntry,
  FolderStats,
  Locations,
  RecentFilters,
  SearchFilters,
  TextPreview,
  TransferScan,
  TransferSummary,
  TrashEntry,
  UndoStep,
  Volume
} from '../../types/explorer'

export const filesystem = {
  getLocations: () => invoke<Locations>('get_locations'),
  getVolumes: () => invoke<Volume[]>('get_volumes'),
  trashCount: () => invoke<number>('trash_count'),
  listDirectory: (path: string) => invoke<FileEntry[]>('list_directory', { path }),
  getParent: (path: string) => invoke<string>('get_parent_directory', { path }),
  searchEntries: (query: SearchFilters) => invoke<FileEntry[]>('search_entries', { query }),
  recentEntries: (query: RecentFilters) => invoke<FileEntry[]>('recent_entries', { query }),
  readTextPreview: (path: string) => invoke<TextPreview>('read_text_preview', { path }),
  createDirectory: (path: string, name: string) => invoke<FileEntry>('create_directory', { path, name }),
  createFile: (path: string, name: string) => invoke<FileEntry>('create_file', { path, name }),
  renameEntry: (path: string, newName: string) => invoke<FileEntry>('rename_entry', { path, newName }),
  trashEntries: (paths: string[], id: string) => invoke('trash_entries', { paths, id }),
  emptyTrash: () => invoke<number>('empty_trash'),
  trashList: () => invoke<TrashEntry[]>('trash_list'),
  restoreTrashItems: (ids: string[]) => invoke<number>('restore_trash_items', { ids }),
  recordCreated: (paths: string[]) => invoke('record_created', { paths }),
  recordRename: (from: string, to: string) => invoke('record_rename', { from, to }),
  undoLast: () => invoke<UndoStep>('undo_last'),
  scanTransfer: (sources: string[], dest: string) => invoke<TransferScan>('scan_transfer', { sources, dest }),
  transferEntries: (id: string, sources: string[], dest: string, cut: boolean, resolutions: ConflictResolution[]) =>
    invoke<TransferSummary>('transfer_entries', { request: { id, sources, dest, cut, resolutions } }),
  cancelTransfer: (id: string) => invoke('cancel_transfer', { id }),
  openWithDefault: (path: string) => invoke('open_with_default', { path }),
  getFolderStats: (path: string) => invoke<FolderStats>('get_folder_stats', { path }),
  getFolderSizes: (paths: string[]) => invoke<Record<string, FolderStats>>('get_folder_sizes', { paths }),
  watchDirectory: (path: string) => invoke('watch_directory', { path }),
  unwatchDirectory: (path: string) => invoke('unwatch_directory', { path })
}
