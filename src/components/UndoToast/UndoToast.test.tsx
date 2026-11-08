import { readFileSync } from 'node:fs'
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { useUndoStore } from '../../stores/undoStore'
import { ConfirmDialog } from '../ConfirmDialog'
import { UndoToast } from '.'

let styles: HTMLStyleElement

beforeEach(() => {
  styles = document.createElement('style')
  styles.textContent = [
    'src/global/tokens.css',
    'src/global/material.css',
    'src/global/material-light.css',
    'src/global/notifications.css',
    'src/components/UndoToast/styles.css',
    'src/components/ConfirmDialog/styles.css'
  ]
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n')
  document.head.append(styles)
  useUndoStore.setState({ toast: { text: 'Concluído', tone: 'ok' } })
})

afterEach(() => {
  cleanup()
  styles.remove()
  useUndoStore.setState({ toast: null })
  delete document.documentElement.dataset.material
  delete document.documentElement.dataset.theme
})

it.each([
  ['dark', 'solid'],
  ['dark', 'mica'],
  ['dark', 'acrylic'],
  ['light', 'solid'],
  ['light', 'mica'],
  ['light', 'acrylic']
])('applies the %s theme and %s material to the toast', (theme, selected) => {
  document.documentElement.dataset.theme = theme
  document.documentElement.dataset.material = selected
  const { getByRole } = render(<UndoToast />)
  const toast = getByRole('status')
  expect(toast.classList.contains('notification-surface')).toBe(true)
  expect(toast.parentElement).toBe(document.body)
  const filter = getComputedStyle(toast).getPropertyValue('backdrop-filter')
  if (selected === 'solid') {
    expect(filter || 'none').toBe('none')
  } else {
    expect(filter).toBe('blur(var(--mat-blur)) saturate(var(--mat-sat))')
    const veil = getComputedStyle(document.documentElement).getPropertyValue('--mat-veil').trim()
    expect(veil).toBe(theme === 'light' ? '#eef0f7a6' : selected === 'mica' ? '#1f2026b8' : '#1c1d2499')
    const background = getComputedStyle(document.documentElement).getPropertyValue('--mat-background')
    expect(background).toContain(theme === 'light' ? '#b9a8ff' : '#4b3f8f')
  }
})

it('applies the shared material to central notification dialogs too', () => {
  document.documentElement.dataset.material = 'acrylic'
  document.documentElement.dataset.theme = 'dark'
  const { getByText } = render(
    <ConfirmDialog title="Aviso" message="Operação falhou" confirmLabel="OK" cancelLabel="Fechar" hideCancel onConfirm={() => {}} onClose={() => {}} />
  )
  const surface = getByText('Aviso').closest('.notification-surface')
  expect(surface).not.toBeNull()
  expect(getComputedStyle(surface as Element).getPropertyValue('backdrop-filter')).toBe('blur(var(--mat-blur)) saturate(var(--mat-sat))')
})
