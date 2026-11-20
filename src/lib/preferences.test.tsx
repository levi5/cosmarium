import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { accentForegroundColor } from './colors'
import { PreferencesProvider, usePreferences } from './preferences'

afterEach(() => {
  cleanup()
  localStorage.clear()
  document.documentElement.removeAttribute('style')
  delete document.documentElement.dataset.theme
  delete document.documentElement.dataset.material
})

function Controls() {
  const preferences = usePreferences()
  return (
    <>
      <button
        type="button"
        onClick={() => {
          preferences.setAccent('custom')
          preferences.setCustomAccent('#000000')
          preferences.setTheme('dark')
        }}
      >
        Black
      </button>
      <button type="button" onClick={() => preferences.setTheme('light')}>
        Light theme
      </button>
    </>
  )
}

it('updates icon contrast when the accent or theme changes without changing the chosen accent', () => {
  render(
    <PreferencesProvider>
      <Controls />
    </PreferencesProvider>
  )
  fireEvent.click(screen.getByRole('button', { name: 'Black' }))
  const style = document.documentElement.style
  expect(style.getPropertyValue('--accent')).toBe('#000000')
  expect(style.getPropertyValue('--on-accent')).toBe('#ffffff')
  expect(style.getPropertyValue('--accent-fg')).toBe(accentForegroundColor('#000000', 'dark'))
  fireEvent.click(screen.getByRole('button', { name: 'Light theme' }))
  expect(style.getPropertyValue('--accent')).toBe('#000000')
  expect(style.getPropertyValue('--accent-fg')).toBe('#000000')
})
