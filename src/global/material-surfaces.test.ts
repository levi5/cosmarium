import { globSync, readFileSync } from 'node:fs'
import { afterEach, beforeEach, expect, it } from 'vitest'

const surfaces = [
  'context-menu',
  'file-context-menu',
  'background-context-menu',
  'dropdown',
  'preview-pane',
  'system-open-dialog',
  'open-with-dialog',
  'productivity-dialog',
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
    'base/Dialog',
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
    'FileBrowser',
    'DriveOverview',
    'DetailsPane',
    'OpenWithDialog',
    'base/Button',
    'base/IconButton',
    'SecondaryPane',
    'Productivity'
  ].map((component) => `src/components/${component}/styles.css`),
  'src/global/tokens.css',
  'src/pages/Settings/styles.css',
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
  const details = getComputedStyle(surface('details-pane'))
  expect(details.getPropertyValue('backdrop-filter') || 'none').toBe(material === 'solid' ? 'none' : 'blur(var(--mat-blur)) saturate(var(--mat-sat))')
  if (material !== 'solid') {
    expect(details.getPropertyValue('background-image')).toContain('var(--mat-background)')
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
    'dialog-backdrop',
    'productivity-backdrop',
    'open-with-dialog__search',
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

it('blurs shared modal backdrops and keeps menus and modal surfaces only slightly translucent', () => {
  expect(getComputedStyle(surface('dialog-backdrop')).getPropertyValue('backdrop-filter')).toBe('blur(10px)')
  const modalRule = Array.from(styles.sheet?.cssRules ?? []).find(
    (rule): rule is CSSStyleRule =>
      rule instanceof CSSStyleRule && rule.style.getPropertyValue('background') === 'color-mix(in srgb, var(--mat-veil-hex) 96%, transparent)'
  )
  expect(modalRule).toBeDefined()
  for (const className of [
    'context-menu',
    'file-context-menu',
    'background-context-menu',
    'dropdown',
    'tag-dialog',
    'prompt-dialog',
    'tool-dialog',
    'conflict-dialog',
    'shortcuts-dialog',
    'properties-dialog',
    'system-open-dialog',
    'open-with-dialog',
    'productivity-dialog'
  ]) {
    expect(modalRule?.selectorText).toContain(`.${className}`)
  }
})

it.each([
  ['dark', 'solid'],
  ['dark', 'mica'],
  ['dark', 'acrylic'],
  ['light', 'solid'],
  ['light', 'mica'],
  ['light', 'acrylic']
])('uses theme and material tokens for nested controls in %s / %s', (theme, material) => {
  document.documentElement.dataset.theme = theme
  document.documentElement.dataset.material = material
  // jsdom does not resolve var() in color properties; verify CSSOM bindings as well as root tokens.
  const declaration = (selector: string, property: string) =>
    Array.from(styles.sheet?.cssRules ?? [])
      .find((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule && rule.selectorText === selector)
      ?.style.getPropertyValue(property)
  for (const selector of ['.button--secondary', '.switch', '.dropdown__switch', '.pane-transfer-rail']) {
    expect(declaration(selector, 'background'), selector).toBe('var(--field-bg)')
  }
  expect(declaration('.button--primary', 'color')).toBe('var(--on-accent)')
  expect(declaration('.pane-transfer-action__direction', 'background')).toBe('var(--card-bg)')
  const root = getComputedStyle(document.documentElement)
  expect(root.getPropertyValue('color-scheme')).toBe(theme)
  expect(root.getPropertyValue('--selected')).toContain('var(--accent)')
  expect(root.getPropertyValue('--accent-fg')).toContain('var(--accent)')
  expect(root.getPropertyValue('--card-bg')).toBe(material === 'solid' ? 'var(--surface-3)' : 'var(--mat-card)')
})

it('makes fields and nested cards opaque when transparency is reduced', () => {
  document.documentElement.dataset.material = 'acrylic'
  reducedStyles.textContent = Array.from(styles.sheet?.cssRules ?? [])
    .filter((rule): rule is CSSMediaRule => rule instanceof CSSMediaRule && rule.conditionText === '(prefers-reduced-transparency: reduce)')
    .flatMap((rule) => Array.from(rule.cssRules, (child) => child.cssText))
    .join('\n')
  document.head.append(reducedStyles)
  const root = getComputedStyle(document.documentElement)
  expect(root.getPropertyValue('--field-bg')).toBe('var(--mat-veil-hex)')
  expect(root.getPropertyValue('--mat-card')).toBe('var(--mat-veil-hex)')
  expect(getComputedStyle(surface('open-with-dialog')).getPropertyValue('backdrop-filter')).toBe('none')
})

it('keeps material selectors out of component stylesheets', () => {
  for (const path of globSync('src/components/**/*.css')) {
    expect(readFileSync(path, 'utf8'), path).not.toContain('data-material')
  }
})
