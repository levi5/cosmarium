import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { PaneToolbar } from './PaneToolbar'

afterEach(cleanup)

it('shares icon-only navigation controls and synchronizes the folder path', () => {
  const onNavigate = vi.fn()
  const onUp = vi.fn()
  const onRefresh = vi.fn()
  const props = { language: 'en' as const, onNavigate, onUp, onRefresh }
  const { rerender } = render(<PaneToolbar {...props} path="/first" />)
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '/second' } })
  fireEvent.click(screen.getByRole('button', { name: 'Folder path' }))
  expect(onNavigate).toHaveBeenCalledWith('/second')
  fireEvent.click(screen.getByRole('button', { name: 'Up one folder' }))
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
  expect(onUp).toHaveBeenCalledOnce()
  expect(onRefresh).toHaveBeenCalledOnce()
  for (const button of screen.getAllByRole('button')) expect(button.textContent).toBe('')
  rerender(<PaneToolbar {...props} path="/third" />)
  expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('/third')
})
