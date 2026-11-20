import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, expect, it } from 'vitest'

let styles: HTMLStyleElement
beforeEach(() => {
  styles = document.createElement('style')
  styles.textContent = [
    'src/components/TabStrip/styles.css',
    'src/global/tokens.css',
    'src/global/material.css',
    'src/global/material-light.css',
    'src/global/material-surfaces.css'
  ]
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n')
  document.head.append(styles)
})
afterEach(() => {
  styles.remove()
  delete document.documentElement.dataset.theme
  delete document.documentElement.dataset.material
})

it.each([
  ['dark', 'solid'],
  ['dark', 'mica'],
  ['dark', 'acrylic'],
  ['light', 'solid'],
  ['light', 'mica'],
  ['light', 'acrylic']
])('derives active tabs from accent and surface in %s / %s', (theme, material) => {
  document.documentElement.dataset.theme = theme
  document.documentElement.dataset.material = material
  const background = getComputedStyle(document.documentElement).getPropertyValue('--tab-active-bg')
  expect(background).toContain('var(--accent)')
  expect(background).toContain(material === 'solid' ? 'var(--surface-2)' : 'var(--mat-veil)')
})

it('uses the same accent-aware background while dragging and a separate selection indicator', () => {
  const rule = (selector: string) =>
    Array.from(styles.sheet?.cssRules ?? []).find((item): item is CSSStyleRule => item instanceof CSSStyleRule && item.selectorText === selector)?.style
  expect(rule('.app-tab.is-active')?.getPropertyValue('background')).toBe('var(--tab-active-bg)')
  expect(rule('.app-tab.is-dragging')?.getPropertyValue('background')).toBe('var(--tab-active-bg)')
  expect(rule('.app-tab.is-active::after')?.getPropertyValue('background')).toBe('var(--accent-line)')
  expect(rule('.app-tab.is-active::after')?.getPropertyValue('pointer-events')).toBe('none')
})
