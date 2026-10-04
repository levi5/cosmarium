const MODIFIER_ORDER = ['ctrl', 'alt', 'shift', 'meta'] as const

type Modifier = (typeof MODIFIER_ORDER)[number]

const MODIFIER_KEYS = new Set([
  'alt',
  'altgraph',
  'capslock',
  'control',
  'dead',
  'fn',
  'fnlock',
  'hyper',
  'meta',
  'numlock',
  'os',
  'scrolllock',
  'shift',
  'super',
  'symbol',
  'symmetrickeylock'
])

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"]'

const ACTIVATABLE_SELECTOR = 'button, a[href], summary, [role="button"]'

const DISPLAY_KEYS: Record<string, string> = {
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  backspace: 'Backspace',
  delete: 'Del',
  enter: 'Enter',
  escape: 'Esc',
  space: 'Space',
  tab: 'Tab',
  home: 'Home',
  end: 'End',
  pageup: 'PgUp',
  pagedown: 'PgDn',
  ' ': 'Space'
}

const MODIFIER_LABELS: Record<Modifier, string> = {
  ctrl: 'Ctrl',
  alt: 'Alt',
  shift: 'Shift',
  meta: 'Super'
}

function isModifier(part: string): part is Modifier {
  return MODIFIER_ORDER.includes(part as Modifier)
}

function capitalize(part: string): string {
  return part.charAt(0).toUpperCase() + part.slice(1)
}

function displayPart(part: string): string {
  if (isModifier(part)) return MODIFIER_LABELS[part]
  const mapped = DISPLAY_KEYS[part]
  if (mapped) return mapped
  if (/^f\d{1,2}$/.test(part)) return part.toUpperCase()
  return part.length === 1 ? part.toUpperCase() : capitalize(part)
}

export function normalizeCombo(combo: string): string {
  const parts = combo
    .toLowerCase()
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)
  const modifiers = MODIFIER_ORDER.filter((modifier) => parts.includes(modifier))
  const keys = parts.filter((part) => !MODIFIER_ORDER.includes(part as Modifier))
  return [...modifiers, ...keys].join('+')
}

export function isValidCombo(combo: string): boolean {
  return combo.length > 0 && combo.split('+').length <= 5
}

export function formatCombo(combo: string): string {
  if (!combo) return ''
  return combo.split('+').map(displayPart).join(' + ')
}

const MODIFIER_FLAGS: Array<[Modifier, (event: KeyboardEvent) => boolean]> = [
  ['ctrl', (event) => event.ctrlKey],
  ['alt', (event) => event.altKey],
  ['shift', (event) => event.shiftKey],
  ['meta', (event) => event.metaKey]
]

function collectModifiers(event: KeyboardEvent): Modifier[] {
  return MODIFIER_FLAGS.filter(([, isPressed]) => isPressed(event)).map(([modifier]) => modifier)
}

function isModifierKey(key: string): boolean {
  return MODIFIER_KEYS.has(key.toLowerCase())
}

export function comboFromEvent(event: KeyboardEvent): string | null {
  const key = event.key === ' ' ? 'space' : event.key.toLowerCase()
  if (!key || isModifierKey(key)) return null
  return [...collectModifiers(event), key].join('+')
}

export function matchesCombo(event: KeyboardEvent, combo: string): boolean {
  if (!combo) return false
  return comboFromEvent(event) === normalizeCombo(combo)
}

function matchesSelector(target: EventTarget | null, selector: string): boolean {
  const element = target as HTMLElement | null
  if (!element || typeof element.closest !== 'function') return false
  return Boolean(element.closest(selector))
}

export function isEditableTarget(target: EventTarget | null): boolean {
  return matchesSelector(target, EDITABLE_SELECTOR)
}

export function isActivatableTarget(target: EventTarget | null): boolean {
  return matchesSelector(target, ACTIVATABLE_SELECTOR)
}

export function comboKeyPart(combo: string): string | null {
  const parts = combo.split('+')
  return parts.length > 0 ? (parts[parts.length - 1] ?? null) : null
}
