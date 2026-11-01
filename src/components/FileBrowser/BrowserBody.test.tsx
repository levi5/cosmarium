import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { BrowserBody } from './BrowserBody'
import type { FileBrowserController } from './useFileBrowser'

vi.mock('../SecondaryPane', () => ({ SecondaryPane: () => <input aria-label="Independent path" defaultValue="/secondary" /> }))
vi.mock('../DetailsPane', () => ({ DetailsPane: () => null }))
vi.mock('./FileTable', () => ({ FileTable: () => null }))
vi.mock('./RecentsList', () => ({ RecentsList: () => null }))
afterEach(cleanup)

it('preserves the second pane while the primary pane refreshes', () => {
  const browser = {
    t: (key: string) => key,
    preferences: { language: 'en' },
    workspace: { currentPath: '/primary', refresh: vi.fn() },
    visibleEntries: [],
    selected: [],
    activeEntry: null,
    tagsOf: () => [],
    busy: false,
    failure: null,
    search: { hasQuery: false },
    split: true,
    detailsPane: false,
    targetsFor: () => [],
    transfers: { doDrop: vi.fn() }
  } as unknown as FileBrowserController
  const { rerender } = render(<BrowserBody browser={browser} compact={false} />)
  fireEvent.change(screen.getByLabelText('Independent path'), { target: { value: '/chosen/folder' } })
  rerender(<BrowserBody browser={{ ...browser, busy: true }} compact={false} />)
  expect((screen.getByLabelText('Independent path') as HTMLInputElement).value).toBe('/chosen/folder')
})
