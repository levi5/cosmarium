import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { Dropdown } from './index'

afterEach(cleanup)

it('reuses menu keyboard navigation and preserves checkbox roles', () => {
  const anchor = document.createElement('button')
  document.body.append(anchor)
  anchor.focus()
  const onClose = vi.fn()
  const { unmount } = render(
    <Dropdown anchor={anchor} onClose={onClose}>
      <button type="button" role="menuitemcheckbox" aria-checked="true">
        View
      </button>
      <button type="button">Sort</button>
    </Dropdown>
  )
  const first = screen.getByRole('menuitemcheckbox')
  expect(document.activeElement).toBe(first)
  fireEvent.keyDown(first, { key: 'ArrowDown' })
  expect(document.activeElement).toBe(screen.getByRole('menuitem'))
  fireEvent.scroll(screen.getByRole('menu'))
  expect(onClose).not.toHaveBeenCalled()
  fireEvent.keyDown(window, { key: 'Escape' })
  expect(onClose).toHaveBeenCalledOnce()
  unmount()
  expect(document.activeElement).toBe(anchor)
  anchor.remove()
})

it('ignores pending scroll events from opening the menu, then closes on later page scrolling', () => {
  let armScroll: FrameRequestCallback | undefined
  const frame = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    armScroll = callback
    return 1
  })
  const anchor = document.createElement('button')
  document.body.append(anchor)
  const onClose = vi.fn()
  const { unmount } = render(
    <Dropdown anchor={anchor} onClose={onClose}>
      <button type="button">Action</button>
    </Dropdown>
  )
  fireEvent.scroll(document.body)
  expect(onClose).not.toHaveBeenCalled()
  armScroll?.(0)
  fireEvent.scroll(document.body)
  expect(onClose).toHaveBeenCalledOnce()
  unmount()
  frame.mockRestore()
  anchor.remove()
})
