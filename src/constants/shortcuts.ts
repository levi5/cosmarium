import type { TranslationKey } from '../lib/i18n'

export type ShortcutId =
  | 'goBack'
  | 'goForward'
  | 'goUp'
  | 'refresh'
  | 'focusSearch'
  | 'focusPath'
  | 'toggleHidden'
  | 'toggleDetailsPane'
  | 'cycleView'
  | 'copy'
  | 'cut'
  | 'paste'
  | 'selectAll'
  | 'delete'
  | 'rename'
  | 'open'
  | 'preview'
  | 'properties'
  | 'newFolder'
  | 'newFile'
  | 'newTab'
  | 'closeTab'
  | 'restoreClosedTab'
  | 'nextTab'
  | 'undo'
  | 'showShortcuts'

export type ShortcutGroupId = 'navigation' | 'files' | 'tabs' | 'general'

export type ShortcutDef = {
  id: ShortcutId
  group: ShortcutGroupId
  label: TranslationKey
  defaultCombo: string
  allowInInput?: boolean
  needsTarget?: boolean
}

export const SHORTCUT_GROUPS: ShortcutGroupId[] = ['navigation', 'files', 'tabs', 'general']

export const SHORTCUT_GROUP_LABELS: Record<ShortcutGroupId, TranslationKey> = {
  navigation: 'shortcutGroupNavigation',
  files: 'shortcutGroupFiles',
  tabs: 'shortcutGroupTabs',
  general: 'shortcutGroupGeneral'
}

export const SHORTCUTS: ShortcutDef[] = [
  { id: 'goBack', group: 'navigation', label: 'goBack', defaultCombo: 'alt+arrowleft' },
  { id: 'goForward', group: 'navigation', label: 'goForward', defaultCombo: 'alt+arrowright' },
  { id: 'goUp', group: 'navigation', label: 'goUp', defaultCombo: 'alt+arrowup' },
  { id: 'refresh', group: 'navigation', label: 'refresh', defaultCombo: 'f5' },
  { id: 'focusSearch', group: 'navigation', label: 'focusSearch', defaultCombo: 'ctrl+f', allowInInput: true },
  { id: 'focusPath', group: 'navigation', label: 'goToPath', defaultCombo: 'ctrl+l', allowInInput: true },

  { id: 'selectAll', group: 'files', label: 'selectAll', defaultCombo: 'ctrl+a' },
  { id: 'copy', group: 'files', label: 'copy', defaultCombo: 'ctrl+c' },
  { id: 'cut', group: 'files', label: 'cut', defaultCombo: 'ctrl+x' },
  { id: 'paste', group: 'files', label: 'paste', defaultCombo: 'ctrl+v' },
  { id: 'delete', group: 'files', label: 'delete_', defaultCombo: 'delete', needsTarget: true },
  { id: 'rename', group: 'files', label: 'rename', defaultCombo: 'f2', needsTarget: true },
  { id: 'open', group: 'files', label: 'open', defaultCombo: 'enter', needsTarget: true },
  { id: 'preview', group: 'files', label: 'preview', defaultCombo: 'space', needsTarget: true },
  { id: 'properties', group: 'files', label: 'properties', defaultCombo: 'alt+enter', needsTarget: true },
  { id: 'newFolder', group: 'files', label: 'newFolder', defaultCombo: 'ctrl+shift+n' },
  { id: 'newFile', group: 'files', label: 'newFile', defaultCombo: 'ctrl+alt+n' },
  { id: 'toggleHidden', group: 'files', label: 'showHidden', defaultCombo: 'ctrl+h' },
  { id: 'toggleDetailsPane', group: 'files', label: 'showDetailsPane', defaultCombo: 'ctrl+e' },
  { id: 'cycleView', group: 'files', label: 'cycleView', defaultCombo: 'ctrl+g' },

  { id: 'newTab', group: 'tabs', label: 'newTab', defaultCombo: 'ctrl+t' },
  { id: 'closeTab', group: 'tabs', label: 'closeTab', defaultCombo: 'ctrl+w', needsTarget: true },
  { id: 'restoreClosedTab', group: 'tabs', label: 'restoreClosedTab', defaultCombo: 'ctrl+shift+t' },
  { id: 'nextTab', group: 'tabs', label: 'nextTab', defaultCombo: 'ctrl+tab' },

  { id: 'undo', group: 'general', label: 'undo', defaultCombo: 'ctrl+z' },

  { id: 'showShortcuts', group: 'general', label: 'showShortcuts', defaultCombo: 'f1', allowInInput: true }
]

const BY_ID = new Map(SHORTCUTS.map((def) => [def.id, def]))

export function getShortcut(id: ShortcutId): ShortcutDef {
  const def = BY_ID.get(id)
  if (!def) throw new Error(`Atalho desconhecido: ${id}`)
  return def
}

export function shortcutsByGroup(): { group: ShortcutGroupId; items: ShortcutDef[] }[] {
  return SHORTCUT_GROUPS.map((group) => ({ group, items: SHORTCUTS.filter((def) => def.group === group) }))
}
