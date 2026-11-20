import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { createTranslator } from '../../lib/i18n'
import type { FileEntry } from '../../types/explorer'
import { BrowserMenus } from './BrowserMenus'
import type { FileBrowserController } from './useFileBrowser'

afterEach(cleanup)

function controller(kind: FileEntry['kind'], detailsPane = false, compact = false) {
  return {
    compact,
    menu: { entry: { path: '/docs/item', name: 'item', kind }, anchorX: 0, anchorY: 0 },
    backgroundMenu: null,
    t: createTranslator('en'),
    workspace: { currentPath: '/docs', refresh: vi.fn() },
    clipboard: { paths: [] },
    preferences: { language: 'en' },
    actions: {},
    inspection: {},
    transfers: {},
    detailsPane,
    setDetailsPane: vi.fn(),
    setMenu: vi.fn()
  } as unknown as FileBrowserController
}

it.each(['file', 'directory'] as const)('offers details directly in the selected %s menu', (kind) => {
  const browser = controller(kind)
  render(<BrowserMenus browser={browser} />)
  const toggle = screen.getByRole('menuitemcheckbox', { name: 'Show details pane' })
  expect(toggle.getAttribute('aria-checked')).toBe('false')
  fireEvent.click(toggle)
  expect(browser.setDetailsPane).toHaveBeenCalledWith(true)
  expect(browser.setMenu).toHaveBeenCalledWith(null)
})

it('allows hiding an already open details pane from the item menu', () => {
  const browser = controller('file', true)
  render(<BrowserMenus browser={browser} />)
  const toggle = screen.getByRole('menuitemcheckbox', { name: 'Show details pane' })
  expect(toggle.getAttribute('aria-checked')).toBe('true')
  fireEvent.click(toggle)
  expect(browser.setDetailsPane).toHaveBeenCalledWith(false)
})

it('does not offer a nonfunctional details toggle in compact recents', () => {
  render(<BrowserMenus browser={controller('file', false, true)} />)
  expect(screen.queryByRole('menuitemcheckbox', { name: 'Show details pane' })).toBeNull()
})
