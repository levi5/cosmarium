import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { IconButton } from './index'

afterEach(cleanup)

it('reuses Button with an accessible name and tooltip, without visible text', () => {
  render(<IconButton icon="grid" label="Grid" aria-pressed={true} />)
  const button = screen.getByRole('button', { name: 'Grid' })
  expect(button.classList.contains('button')).toBe(true)
  expect(button.classList.contains('icon-button')).toBe(true)
  expect(button.getAttribute('title')).toBe('Grid')
  expect(button.getAttribute('aria-pressed')).toBe('true')
  expect(button.textContent).toBe('')
  expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
})

it('does not invoke a disabled action', () => {
  const onClick = vi.fn()
  render(<IconButton icon="copy" label="Copy" disabled onClick={onClick} />)
  fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
  expect(onClick).not.toHaveBeenCalled()
})
