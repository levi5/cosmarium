import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { SavedSearches } from '.'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

it('saves, opens and removes searches from a single icon dropdown', () => {
  const onSelect = vi.fn()
  render(<SavedSearches query="ext:pdf" root="/docs" language="en" onSelect={onSelect} />)
  expect(screen.getAllByRole('button')).toHaveLength(1)
  const trigger = screen.getByRole('button', { name: 'Saved searches' })
  expect(trigger.textContent).toBe('')
  fireEvent.click(trigger)
  fireEvent.click(screen.getByRole('menuitem', { name: 'Save search' }))
  expect((screen.getByRole('menuitem', { name: 'Save search' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('menuitem', { name: /ext:pdf.*\/docs/ }))
  expect(onSelect).toHaveBeenCalledWith({ query: 'ext:pdf', root: '/docs' })
  expect(screen.queryByRole('menu')).toBeNull()
  fireEvent.click(trigger)
  fireEvent.click(screen.getByRole('menuitem', { name: 'Remove: ext:pdf' }))
  expect(JSON.parse(localStorage.getItem('cosmarium.saved-searches') ?? 'null')).toEqual([])
})
