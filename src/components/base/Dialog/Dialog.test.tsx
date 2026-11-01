import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Dialog } from './index'

afterEach(cleanup)

describe('dialog accessibility', () => {
  it('focuses the input, traps tab and restores focus when closed', () => {
    const trigger = document.createElement('button')
    document.body.append(trigger)
    trigger.focus()
    const onClose = vi.fn()
    const { unmount } = render(
      <Dialog backdropClass="test" dismissLabel="Rename" onClose={onClose}>
        <input aria-label="Name" />
        <button type="button">Apply</button>
      </Dialog>
    )
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('true')
    expect(document.activeElement).toBe(screen.getByRole('textbox'))
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Apply' }))
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(screen.getByRole('textbox'))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
    unmount()
    expect(document.activeElement).toBe(trigger)
    trigger.remove()
  })
})
