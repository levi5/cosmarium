import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { PreferencesProvider } from '../../lib/preferences'
import { useDriveAliasStore } from '../../stores/driveAliasStore'
import { DriveAliasButton } from '.'

afterEach(() => {
  cleanup()
  useDriveAliasStore.setState({ aliases: {} })
  localStorage.clear()
})

it('edits and clears a display-only nickname through the existing prompt dialog', () => {
  const volume = { name: '/dev/sda1', mount_point: '/media/data', total_space: 100, available_space: 50 }
  render(
    <PreferencesProvider>
      <DriveAliasButton volume={volume} />
    </PreferencesProvider>
  )
  fireEvent.click(screen.getByRole('button', { name: /Apelido da unidade/ }))
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Dados' } })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(useDriveAliasStore.getState().aliases['/media/data']).toBe('Dados')
  fireEvent.click(screen.getByRole('button', { name: /Apelido da unidade/ }))
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(useDriveAliasStore.getState().aliases['/media/data']).toBeUndefined()
  expect(volume.name).toBe('/dev/sda1')
})
