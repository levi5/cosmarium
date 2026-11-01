import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTabDrag } from './useTabDrag'

function Tabs({ reorder }: { reorder: (from: number, to: number) => void }) {
  const drag = useTabDrag(['a', 'b', 'c'], reorder)
  return (
    <div ref={drag.listRef} onPointerMove={drag.onPointerMove} onPointerUp={drag.onPointerUp} onPointerCancel={drag.onPointerCancel}>
      {['a', 'b', 'c'].map((id, index) => (
        <div key={id} role="tab" tabIndex={0} style={drag.styleFor(index)} onPointerDown={(event) => drag.onPointerDown(event, index)}>
          {id}
        </div>
      ))}
    </div>
  )
}

beforeEach(() => {
  vi.stubGlobal('PointerEvent', MouseEvent)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const index = this.getAttribute('role') === 'tab' ? ['a', 'b', 'c'].indexOf(this.textContent ?? '') : 0
    const width = this.getAttribute('role') === 'tab' ? 100 : 200
    return { left: index * 100, right: index * 100 + width, width, top: 0, bottom: 35, height: 35, x: index * 100, y: 0, toJSON() {} }
  })
  HTMLElement.prototype.setPointerCapture = vi.fn()
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => false)
  HTMLElement.prototype.releasePointerCapture = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('tab dragging', () => {
  it('does not move a tab on a click or a small movement', () => {
    const reorder = vi.fn()
    render(<Tabs reorder={reorder} />)
    const tab = screen.getAllByRole('tab')[0]
    fireEvent.pointerDown(tab, { button: 0, clientX: 50 })
    fireEvent.pointerUp(tab, { clientX: 53 })
    expect(reorder).not.toHaveBeenCalled()
  })

  it('opens a gap and commits only after crossing the next tab center', () => {
    const reorder = vi.fn()
    render(<Tabs reorder={reorder} />)
    const [first, second] = screen.getAllByRole('tab')
    fireEvent.pointerDown(first, { button: 0, clientX: 50 })
    fireEvent.pointerMove(first, { clientX: 110 })
    expect(second.style.transform).toBe('translateX(0px)')
    fireEvent.pointerMove(first, { clientX: 160 })
    expect(first.style.transform).toBe('translateX(110px)')
    expect(second.style.transform).toBe('translateX(-100px)')
    expect(reorder).not.toHaveBeenCalled()
    fireEvent.pointerUp(first, { clientX: 160 })
    expect(reorder).toHaveBeenCalledWith(0, 1)
  })

  it('moves a tab to the beginning', () => {
    const reorder = vi.fn()
    render(<Tabs reorder={reorder} />)
    const tab = screen.getAllByRole('tab')[2]
    fireEvent.pointerDown(tab, { button: 0, clientX: 250 })
    fireEvent.pointerUp(tab, { clientX: 20 })
    expect(reorder).toHaveBeenCalledWith(2, 0)
  })

  it.each(['escape', 'cancel', 'blur'])('cancels without changing order on %s', (reason) => {
    const reorder = vi.fn()
    render(<Tabs reorder={reorder} />)
    const tab = screen.getAllByRole('tab')[0]
    fireEvent.pointerDown(tab, { button: 0, clientX: 50 })
    fireEvent.pointerMove(tab, { clientX: 270 })
    if (reason === 'escape') fireEvent.keyDown(window, { key: 'Escape' })
    if (reason === 'cancel') fireEvent.pointerCancel(tab)
    if (reason === 'blur') fireEvent.blur(window)
    expect(reorder).not.toHaveBeenCalled()
    expect(tab.style.transform).toBe('')
  })

  it('scrolls near the edge even when the pointer stops', () => {
    let tick: FrameRequestCallback = () => {}
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      tick = callback
      return 1
    })
    const reorder = vi.fn()
    render(<Tabs reorder={reorder} />)
    const tab = screen.getAllByRole('tab')[0]
    fireEvent.pointerDown(tab, { button: 0, clientX: 50 })
    fireEvent.pointerMove(tab, { clientX: 195 })
    act(() => tick(16))
    expect(tab.parentElement?.scrollLeft).toBeGreaterThan(0)
    fireEvent.pointerCancel(tab)
  })
})
