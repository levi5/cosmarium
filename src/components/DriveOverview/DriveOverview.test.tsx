import { readFileSync } from 'node:fs'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { DriveOverview } from '.'

const workspace = vi.hoisted(() => ({
  volumes: [{ name: 'Data', mount_point: '/media/data', total_space: 100, available_space: 50 }],
  navigateTo: vi.fn()
}))
vi.mock('../../lib/files', () => ({ useFileWorkspace: () => workspace }))
vi.mock('../../lib/preferences', () => ({ usePreferences: () => ({ language: 'en' }) }))

let styles: HTMLStyleElement
beforeEach(() => {
  styles = document.createElement('style')
  styles.textContent = [
    'src/global/tokens.css',
    'src/global/material.css',
    'src/global/material-light.css',
    'src/global/material-surfaces.css',
    'src/components/base/Button/styles.css',
    'src/components/base/IconButton/styles.css',
    'src/components/DriveOverview/styles.css'
  ]
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n')
  document.head.append(styles)
})
afterEach(() => {
  cleanup()
  styles.remove()
  delete document.documentElement.dataset.material
  delete document.documentElement.dataset.theme
  vi.clearAllMocks()
})

it.each([
  ['dark', 'solid'],
  ['dark', 'mica'],
  ['dark', 'acrylic'],
  ['light', 'solid'],
  ['light', 'mica'],
  ['light', 'acrylic']
])('applies the %s theme and %s material to the whole drive card', (theme, material) => {
  document.documentElement.dataset.theme = theme
  document.documentElement.dataset.material = material
  const { getByTitle, container } = render(<DriveOverview />)
  const open = getByTitle('/media/data')
  const card = open.closest('.drive-overview__card')
  const alias = container.querySelector('.drive-overview__alias')
  if (!card || !alias) throw new Error('Missing drive controls')
  const filter = getComputedStyle(card).getPropertyValue('backdrop-filter')
  expect(filter || 'none').toBe(material === 'solid' ? 'none' : 'blur(var(--mat-blur)) saturate(var(--mat-sat))')
  for (const button of [open, alias]) {
    expect(getComputedStyle(button).backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(getComputedStyle(button).getPropertyValue('backdrop-filter') || 'none').toBe('none')
  }
  expect(container.querySelector<HTMLElement>('.drive-overview__bar i')?.style.width).toBe('50%')
})

it('keeps drive navigation and nickname editing separate', () => {
  const { getByTitle, container } = render(<DriveOverview />)
  fireEvent.click(getByTitle('/media/data'))
  expect(workspace.navigateTo).toHaveBeenCalledWith('/media/data')
  workspace.navigateTo.mockClear()
  const alias = container.querySelector('.drive-overview__alias')
  if (!alias) throw new Error('Missing nickname control')
  fireEvent.click(alias)
  expect(workspace.navigateTo).not.toHaveBeenCalled()
})

it('collapses and expands the drives without navigating', () => {
  render(<DriveOverview />)
  const heading = screen.getByRole('button', { name: 'Drives' })
  const grid = document.getElementById(heading.getAttribute('aria-controls') as string)
  expect(grid?.hidden).toBe(false)
  expect(heading.getAttribute('aria-expanded')).toBe('true')

  fireEvent.click(heading)
  expect(grid?.hidden).toBe(true)
  expect(heading.getAttribute('aria-expanded')).toBe('false')
  expect(screen.queryByRole('button', { name: /^Data/ })).toBeNull()
  expect(workspace.navigateTo).not.toHaveBeenCalled()

  fireEvent.click(heading)
  expect(grid?.hidden).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: /^Data/ }))
  expect(workspace.navigateTo).toHaveBeenCalledWith('/media/data')
})
