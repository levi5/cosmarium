import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { FileTools } from '.'

afterEach(cleanup)

it('shows compact icon triggers, keeping tool labels inside the shared dropdown', () => {
  const onSplit = vi.fn()
  render(<FileTools entries={[]} path="/home" language="en" split={false} onSplit={onSplit} onChanged={vi.fn()} onRenamed={vi.fn()} />)
  const buttons = screen.getAllByRole('button')
  expect(buttons).toHaveLength(2)
  expect(buttons.every((button) => button.textContent === '')).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Dual pane' }))
  expect(onSplit).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole('button', { name: 'Tools' }))
  expect(screen.getByRole('menu')).toBeTruthy()
  expect((screen.getByRole('menuitem', { name: 'Create ZIP' }) as HTMLButtonElement).disabled).toBe(true)
  expect((screen.getByRole('menuitem', { name: 'Extract ZIP' }) as HTMLButtonElement).disabled).toBe(true)
  expect((screen.getByRole('menuitem', { name: 'Find duplicates' }) as HTMLButtonElement).disabled).toBe(false)
  fireEvent.keyDown(window, { key: 'Escape' })
  expect(screen.queryByRole('menu')).toBeNull()
})
