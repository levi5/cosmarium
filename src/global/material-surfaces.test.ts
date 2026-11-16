import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, expect, it } from 'vitest'

const surfaces = [
  'context-menu',
  'file-context-menu',
  'background-context-menu',
  'dropdown',
  'preview-pane',
  'system-open-dialog',
  'tool-dialog',
  'prompt-dialog',
  'conflict-dialog',
  'shortcuts-dialog',
  'tag-dialog',
  'properties-dialog'
]
const stylesheets = [
  ...[
    'base/ContextMenu',
    'base/Dropdown',
    'FileContextMenu',
    'BackgroundContextMenu',
    'PreviewPane',
    'FileTools',
    'PromptDialog',
    'ConflictDialog',
    'ShortcutsDialog',
    'TagDialog',
    'PropertiesDialog',
    'SearchBox',
    'FileBrowser'
  ].map((component) => `src/components/${component}/styles.css`),
  'src/global/tokens.css',
  'src/global/material.css',
  'src/global/material-light.css',
  'src/global/material-surfaces.css'
]
let styles: HTMLStyleElement
let reducedStyles: HTMLStyleElement

beforeEach(() => {
  styles = document.createElement('style')
  styles.textContent = stylesheets.map((path) => readFileSync(path, 'utf8')).join('\n')
  document.head.append(styles)
  reducedStyles = document.createElement('style')
})

afterEach(() => {
  document.body.replaceChildren()
  styles.remove()
  reducedStyles.remove()
  delete document.documentElement.dataset.material
  delete document.documentElement.dataset.theme
})

function surface(className: string) {
  const element = document.createElement('div')
  element.className = className
  document.body.append(element)
  return element
}

it.each([
  ['dark', 'solid'],
  ['dark', 'mica'],
  ['dark', 'acrylic'],
  ['light', 'solid'],
  ['light', 'mica'],
  ['light', 'acrylic']
])('styles every floating surface in %s / %s', (theme, material) => {
  document.documentElement.dataset.theme = theme
  document.documentElement.dataset.material = material
  for (const className of surfaces) {
    const filter = getComputedStyle(surface(className)).getPropertyValue('backdrop-filter')
    expect(filter || 'none', className).toBe(material === 'solid' ? 'none' : 'blur(var(--mat-blur)) saturate(var(--mat-sat))')
  }
  const veil = getComputedStyle(document.documentElement).getPropertyValue('--mat-veil').trim()
  if (material !== 'solid') {
    expect(veil).toBe(theme === 'light' ? '#eef0f7a6' : material === 'mica' ? '#1f2026b8' : '#1c1d2499')
  }
})

it.each([
  ['dark', 'mica'],
  ['dark', 'acrylic'],
  ['light', 'mica'],
  ['light', 'acrylic']
])('removes blur across the UI with reduced transparency in %s / %s', (theme, material) => {
  document.documentElement.dataset.theme = theme
  document.documentElement.dataset.material = material
  // jsdom does not evaluate media preferences. Apply the matching media rules
  // explicitly so their cascade is checked against the normal component styles.
  reducedStyles.textContent = Array.from(styles.sheet?.cssRules ?? [])
    .filter((rule): rule is CSSMediaRule => rule instanceof CSSMediaRule && rule.conditionText === '(prefers-reduced-transparency: reduce)')
    .flatMap((rule) => Array.from(rule.cssRules, (child) => child.cssText))
    .join('\n')
  document.head.append(reducedStyles)
  for (const className of [
    ...surfaces,
    'app-content',
    'sidebar',
    'titlebar',
    'status-bar',
    'details-pane',
    'notification-surface',
    'breadcrumb',
    'search-box',
    'preview-backdrop'
  ]) {
    const computed = getComputedStyle(surface(className))
    expect(computed.getPropertyValue('backdrop-filter'), className).toBe('none')
  }
  expect(getComputedStyle(document.documentElement).getPropertyValue('--mat-veil').trim()).toBe('var(--mat-veil-hex)')
})

it('keeps theme material variables on the root instead of changing them on hover', () => {
  for (const rule of Array.from(styles.sheet?.cssRules ?? [])) {
    if (!(rule instanceof CSSStyleRule) || !rule.style.getPropertyValue('--mat-veil')) continue
    expect(rule.selectorText).not.toContain(':hover')
    expect(rule.selectorText).not.toMatch(/:root[^,]*\s+:root/)
  }
})
