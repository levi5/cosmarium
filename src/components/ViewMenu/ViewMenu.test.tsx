import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ViewMenu } from '.'

afterEach(cleanup)

it('places the size label before the trailing switch and toggles it', () => {
  const onShowSize = vi.fn()
  render(
    <ViewMenu
      iconSize="medium"
      showSize={false}
      labels={{ view: 'Views', iconSize: 'Icon size', iconSmall: 'Small', iconMedium: 'Medium', iconLarge: 'Large', showSize: 'Show size' }}
      onIconSize={vi.fn()}
      onShowSize={onShowSize}
    />
  )
  fireEvent.click(screen.getByRole('button', { name: 'Views' }))
  const option = screen.getByRole('menuitemcheckbox', { name: 'Show size' })
  expect(option.firstElementChild?.textContent).toBe('Show size')
  expect(option.lastElementChild?.classList.contains('dropdown__switch')).toBe(true)
  fireEvent.click(option)
  expect(onShowSize).toHaveBeenCalledWith(true)
})
