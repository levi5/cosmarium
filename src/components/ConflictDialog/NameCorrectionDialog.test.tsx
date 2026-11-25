import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { NameCorrectionDialog } from './NameCorrectionDialog'

afterEach(cleanup)

it('previews corrected names without hiding trailing spaces and requires confirmation', () => {
  const onConfirm = vi.fn()
  const onClose = vi.fn()
  render(<NameCorrectionDialog language="pt-BR" changes={[{ source: '/docs/Terreno ', suggested_name: 'Terreno' }]} onConfirm={onConfirm} onClose={onClose} />)
  expect(screen.getByText('"/docs/Terreno "')).toBeTruthy()
  expect(screen.getByText('"Terreno"')).toBeTruthy()
  expect(onConfirm).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Corrigir nomes e continuar' }))
  expect(onConfirm).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(onClose).toHaveBeenCalledOnce()
})
