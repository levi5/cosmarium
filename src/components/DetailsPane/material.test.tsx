import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, expect, it } from 'vitest'

let styles: HTMLStyleElement
let pane: HTMLElement

beforeEach(() => {
  styles = document.createElement('style')
  styles.textContent = ['src/global/tokens.css', 'src/global/material.css', 'src/global/material-light.css', 'src/components/DetailsPane/styles.css']
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n')
  document.head.append(styles)
  pane = document.createElement('aside')
  pane.className = 'details-pane'
  document.body.append(pane)
})

afterEach(() => {
  pane.remove()
  styles.remove()
  delete document.documentElement.dataset.material
  delete document.documentElement.dataset.theme
})

it.each([
  ['dark', 'solid'],
  ['dark', 'mica'],
  ['dark', 'acrylic'],
  ['light', 'solid'],
  ['light', 'mica'],
  ['light', 'acrylic']
])('respects the %s theme and %s material', (theme, material) => {
  document.documentElement.dataset.theme = theme
  document.documentElement.dataset.material = material
  const style = getComputedStyle(pane)
  const filter = style.getPropertyValue('backdrop-filter')
  if (material === 'solid') {
    expect(filter || 'none').toBe('none')
  } else {
    expect(filter).toBe('blur(var(--mat-blur)) saturate(var(--mat-sat))')
    const veil = getComputedStyle(document.documentElement).getPropertyValue('--mat-veil').trim()
    expect(veil).toBe(theme === 'light' ? '#eef0f7a6' : material === 'mica' ? '#1f2026b8' : '#1c1d2499')
  }
})
