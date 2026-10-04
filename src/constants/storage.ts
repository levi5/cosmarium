export const STORAGE = {
  theme: 'cosmarium-theme',
  accent: 'cosmarium-accent',
  customAccent: 'cosmarium-custom-accent',
  language: 'cosmarium-language',
  material: 'cosmarium-material',
  iconSize: 'cosmarium-icon-size',
  showSize: 'cosmarium-show-size',
  showHidden: 'cosmarium-show-hidden',
  showRecent: 'cosmarium-show-recent',
  fileView: 'cosmarium-file-view',
  sortKey: 'cosmarium-sort-key',
  sortDirection: 'cosmarium-sort-direction',
  searchQuery: 'cosmarium-search-query',
  detailsPane: 'cosmarium-details-pane',
  recentList: 'cosmarium-recent-list',
  quickAccess: 'cosmarium-quick-access',
  quickAccessExpanded: 'cosmarium-quick-access-expanded',
  tags: 'cosmarium-tags',
  taggedPaths: 'cosmarium-tagged-paths'
} as const

export type StorageKey = (typeof STORAGE)[keyof typeof STORAGE]

export function readStorage(key: StorageKey): string | null {
  return localStorage.getItem(key)
}

export function writeStorage(key: StorageKey, value: string): void {
  localStorage.setItem(key, value)
}
