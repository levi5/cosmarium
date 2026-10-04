export type FileEntry = {
  name: string
  path: string
  kind: 'directory' | 'file'
  size: number
  modified: number | null
  accessed: number | null
  created?: number | null
  hidden: boolean
}

export type Locations = {
  home: string
  desktop: string
  downloads: string
  documents: string
  pictures: string
  music: string
  videos: string
  trash: string
}

export type Volume = {
  name: string
  mount_point: string
  total_space: number
  available_space: number
}

export type FolderStats = {
  size: number
  files: number
  dirs: number
  truncated: boolean
}

export type ExplorerTab = {
  id: string
  title: string
  path: string
  history: string[]
  historyIndex: number
}

export type TrashEntry = {
  id: string
  name: string
  original_path: string
  deleted_at: number
  size: number
  entries: number
  is_dir: boolean
}

export type UndoStep =
  | { kind: 'restore_trash'; ids: string[]; count: number }
  | { kind: 'remove_copies'; paths: string[]; count: number }
  | { kind: 'remove_created'; paths: string[]; count: number }
  | { kind: 'rename'; from: string; to: string }
  | { kind: 'move_back'; from: string[]; to: string[]; count: number }
  | { kind: 'clear' }

export type ConflictAction = 'replace' | 'skip' | 'keep_both'

export type TransferConflict = {
  name: string
  is_dir: boolean
}

export type TransferScan = {
  files: number
  bytes: number
  conflicts: TransferConflict[]
}

export type ConflictResolution = {
  name: string
  action: ConflictAction
}

export type TransferProgress = {
  id: string
  cut: boolean
  kind: 'copy' | 'move' | 'trash'
  done_files: number
  total_files: number
  done_bytes: number
  total_bytes: number
  finished: boolean
  error: string | null
}

export type TransferSummary = {
  copied: number
  skipped: number
  cancelled: boolean
}

export type SearchFilters = {
  text: string
  root: string
  extensions: string[]
  maxDepth: number
  minSize: number
  limit: number
  includeHidden: boolean
}

export type RecentFilters = {
  roots: string[]
  limit: number
  includeHidden: boolean
}

export type TextPreview = {
  text: string
  truncated: boolean
  isText: boolean
  size: number
}

export type SortKey = 'name' | 'modified' | 'accessed' | 'type' | 'size'
export type SortDirection = 'asc' | 'desc'

export type ParsedQuery = {
  text: string
  kind: 'all' | 'file' | 'folder'
  extensions: string[]
  minSize: number
  maxDepth: number
  includeHidden: boolean
}
