import type { FileEntry, ParsedQuery, SortDirection, SortKey } from '../types/explorer'

type EntryPredicate = (entry: FileEntry) => boolean
type EntryKind = ParsedQuery['kind']
type SpecificKind = Exclude<EntryKind, 'all'>

const KIND_DIRECTORY = 'directory'
const KIND_FILE = 'file'
const MAX_DEPTH_LIMIT = 32

const SIZE_FACTORS: Record<string, number> = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3, tb: 1024 ** 4 }

const KIND_MATCHERS: Record<SpecificKind, EntryPredicate> = {
  file: (entry) => entry.kind === KIND_FILE,
  folder: (entry) => entry.kind === KIND_DIRECTORY
}

function emptyQuery(showHidden: boolean): ParsedQuery {
  return { text: '', kind: 'all', extensions: [], minSize: 0, maxDepth: 8, includeHidden: showHidden }
}

function resolveKind(value: string): SpecificKind | null {
  const normalized = value.toLowerCase()
  if (normalized.startsWith(KIND_FILE)) return 'file'
  if (normalized.startsWith('fold') || normalized.startsWith('dir')) return 'folder'
  return null
}

function parseExtensions(value: string): string[] {
  return value
    .split(',')
    .map((extension) => extension.trim().replace(/^\./, '').toLowerCase())
    .filter(Boolean)
}

function parseSize(value: string): number | null {
  const match = value.trim().match(/^>?(\d+(?:\.\d+)?)\s*(b|kb|mb|gb|tb)?$/i)
  if (!match) return null
  const amount = Number.parseFloat(match[1])
  if (!Number.isFinite(amount)) return null
  const unit = (match[2] || 'b').toLowerCase()
  return Math.round(amount * (SIZE_FACTORS[unit] ?? 1))
}

function parseDepth(value: string): number | null {
  const depth = Number.parseInt(value, 10)
  return Number.isFinite(depth) ? Math.max(0, Math.min(MAX_DEPTH_LIMIT, depth)) : null
}

function parseHiddenFlag(value: string): boolean {
  const normalized = value.toLowerCase()
  return normalized !== 'false' && normalized !== '0'
}

function applyFilterToken(result: ParsedQuery, key: string, value: string): boolean {
  if (key === 'type' || key === 'kind') {
    const kind = resolveKind(value)
    if (!kind) return false
    result.kind = kind
    return true
  }
  if (key === 'ext' || key === 'extension') {
    const extensions = parseExtensions(value)
    if (extensions.length === 0) return false
    result.extensions.push(...extensions)
    return true
  }
  if (key === 'size') {
    const bytes = parseSize(value)
    if (bytes === null) return false
    result.minSize = bytes
    return true
  }
  if (key === 'depth') {
    const depth = parseDepth(value)
    if (depth === null) return false
    result.maxDepth = depth
    return true
  }
  if (key === 'hidden') {
    result.includeHidden = parseHiddenFlag(value)
    return true
  }
  return false
}

export function parseQuery(input: string, showHidden = false): ParsedQuery {
  const result = emptyQuery(showHidden)
  const free: string[] = []

  for (const token of input.split(/\s+/)) {
    const separator = token.indexOf(':')
    const isFilter = separator > 0
    const key = isFilter ? token.slice(0, separator).toLowerCase() : ''
    const value = isFilter ? token.slice(separator + 1) : ''
    if (isFilter && applyFilterToken(result, key, value)) continue
    free.push(token)
  }

  result.text = free.join(' ').trim()
  return result
}

function lowercaseExtension(name: string): string {
  const index = name.lastIndexOf('.')
  return index > 0 ? name.slice(index + 1).toLowerCase() : ''
}

function buildPredicates(query: ParsedQuery): EntryPredicate[] {
  const needle = query.text.toLowerCase()
  const predicates: EntryPredicate[] = []

  if (!query.includeHidden) predicates.push((entry) => !entry.hidden)
  if (query.kind !== 'all') predicates.push(KIND_MATCHERS[query.kind])
  if (query.extensions.length > 0) {
    const allowed = query.extensions
    predicates.push((entry) => allowed.includes(lowercaseExtension(entry.name)))
  }
  if (query.minSize > 0) predicates.push((entry) => entry.kind !== KIND_FILE || entry.size >= query.minSize)
  if (needle) predicates.push((entry) => entry.name.toLowerCase().includes(needle))

  return predicates
}

export function filterEntries(entries: FileEntry[], query: ParsedQuery): FileEntry[] {
  const predicates = buildPredicates(query)
  return entries.filter((entry) => predicates.every((matches) => matches(entry)))
}

export function recencyOf(entry: FileEntry): number {
  return Math.max(entry.accessed ?? 0, entry.modified ?? 0)
}

function byName(left: FileEntry, right: FileEntry): number {
  return left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' })
}

function compareEntries(left: FileEntry, right: FileEntry, key: SortKey): number {
  switch (key) {
    case 'size':
      return left.size - right.size
    case 'modified':
      return (left.modified ?? 0) - (right.modified ?? 0)
    case 'accessed':
      return recencyOf(left) - recencyOf(right)
    case 'type':
      return lowercaseExtension(left.name).localeCompare(lowercaseExtension(right.name))
    default:
      return byName(left, right)
  }
}

function directoryRank(entry: FileEntry): number {
  return entry.kind === KIND_DIRECTORY ? 0 : 1
}

export function sortEntries(entries: FileEntry[], key: SortKey, direction: SortDirection): FileEntry[] {
  const sign = direction === 'asc' ? 1 : -1
  return [...entries].sort((left, right) => {
    const folderOrder = directoryRank(left) - directoryRank(right)
    return folderOrder !== 0 ? folderOrder : compareEntries(left, right, key) * sign
  })
}

export function sortByRecency(entries: FileEntry[]): FileEntry[] {
  return [...entries].sort((left, right) => recencyOf(right) - recencyOf(left) || byName(left, right))
}
