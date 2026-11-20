import { readFileSync } from 'node:fs'
import { afterEach, expect, it } from 'vitest'

let sheet: HTMLStyleElement | undefined
afterEach(() => sheet?.remove())

it.each(['PromptDialog', 'ConfirmDialog', 'TagDialog', 'PropertiesDialog'])('keeps %s scrollable within short viewports', (component) => {
  sheet = document.createElement('style')
  sheet.textContent = readFileSync(`src/components/${component}/styles.css`, 'utf8')
  document.head.append(sheet)
  const selector = `.${component.replace(/[A-Z]/g, (letter, index) => `${index ? '-' : ''}${letter.toLowerCase()}`)}`
  const rule = Array.from(sheet.sheet?.cssRules ?? []).find((item): item is CSSStyleRule => item instanceof CSSStyleRule && item.selectorText === selector)
  expect(rule?.style.getPropertyValue('max-height')).toContain('100dvh')
  expect(rule?.style.getPropertyValue('overflow-y') || rule?.style.getPropertyValue('overflow')).toBe('auto')
})

it('honors reduced motion across component and inline animations', () => {
  sheet = document.createElement('style')
  sheet.textContent = readFileSync('src/global/reset.css', 'utf8')
  document.head.append(sheet)
  const media = Array.from(sheet.sheet?.cssRules ?? []).find(
    (rule): rule is CSSMediaRule => rule instanceof CSSMediaRule && rule.conditionText === '(prefers-reduced-motion: reduce)'
  )
  const rule = media?.cssRules[0] as CSSStyleRule | undefined
  expect(rule?.style.getPropertyValue('animation-duration')).toBe('0.01ms')
  expect(rule?.style.getPropertyPriority('animation-duration')).toBe('important')
  expect(rule?.style.getPropertyValue('animation-delay')).toBe('0ms')
  expect(rule?.style.getPropertyValue('transition-duration')).toBe('0.01ms')
})
