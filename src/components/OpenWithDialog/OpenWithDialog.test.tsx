import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { filesystem } from '../../services/tauri/filesystem'
import type { FileEntry } from '../../types/explorer'
import { OpenWithDialog } from '.'

vi.mock('../../services/tauri/filesystem', () => ({
  filesystem: { listApplications: vi.fn(), openWithApplication: vi.fn() }
}))

const entry = { path: '/notes/note.txt', name: 'note.txt', kind: 'file' } as FileEntry
const apps = [
  { id: 'editor.desktop', name: 'Text Editor', isDefault: true },
  { id: 'other.desktop', name: 'Other Editor', isDefault: false }
]
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(filesystem.listApplications).mockResolvedValue(apps)
})
afterEach(cleanup)

it('lists compatible apps and launches only the selected app', async () => {
  const onClose = vi.fn()
  render(<OpenWithDialog entry={entry} language="pt-BR" onClose={onClose} />)
  expect(await screen.findByText('Padrão')).toBeTruthy()
  expect(filesystem.listApplications).toHaveBeenCalledWith(entry.path)
  expect(filesystem.openWithApplication).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Other Editor' }))
  await waitFor(() => expect(onClose).toHaveBeenCalled())
  expect(filesystem.openWithApplication).toHaveBeenCalledWith(entry.path, 'other.desktop')
})

it('shows launch errors and allows another choice', async () => {
  vi.mocked(filesystem.openWithApplication).mockRejectedValueOnce(new Error('Launch failed'))
  const onClose = vi.fn()
  render(<OpenWithDialog entry={entry} language="pt-BR" onClose={onClose} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Other Editor' }))
  expect((await screen.findByRole('alert')).textContent).toBe('Launch failed')
  expect(onClose).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Text Editor Padrão' }))
  await waitFor(() => expect(onClose).toHaveBeenCalled())
})

it('handles empty app lists', async () => {
  vi.mocked(filesystem.listApplications).mockResolvedValue([])
  render(<OpenWithDialog entry={entry} language="pt-BR" onClose={() => {}} />)
  expect(await screen.findByText('Nenhum aplicativo compatível encontrado para este arquivo.')).toBeTruthy()
})

it('shows app discovery failures', async () => {
  vi.mocked(filesystem.listApplications).mockRejectedValue(new Error('Lookup failed'))
  render(<OpenWithDialog entry={entry} language="pt-BR" onClose={() => {}} />)
  expect((await screen.findByRole('alert')).textContent).toBe('Lookup failed')
})

it('cancels without opening a file', async () => {
  const onClose = vi.fn()
  render(<OpenWithDialog entry={entry} language="pt-BR" onClose={onClose} />)
  await screen.findByText('Other Editor')
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(onClose).toHaveBeenCalled()
  expect(filesystem.openWithApplication).not.toHaveBeenCalled()
})

it('filters applications by name without launching them', async () => {
  render(<OpenWithDialog entry={entry} language="pt-BR" onClose={() => {}} />)
  const search = await screen.findByRole('searchbox', { name: 'Buscar aplicativos…' })
  fireEvent.change(search, { target: { value: '  OTHER  ' } })
  expect(screen.getByRole('button', { name: 'Other Editor' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Text Editor Padrão' })).toBeNull()
  expect(filesystem.openWithApplication).not.toHaveBeenCalled()
  fireEvent.change(search, { target: { value: 'missing' } })
  expect(screen.getByRole('status').textContent).toBe('Nenhum aplicativo corresponde à busca.')
  fireEvent.change(search, { target: { value: '' } })
  expect(screen.getByRole('button', { name: 'Text Editor Padrão' })).toBeTruthy()
})

it('shows file context and closes using the header button', async () => {
  const onClose = vi.fn()
  render(<OpenWithDialog entry={entry} language="en" onClose={onClose} />)
  await screen.findByText('Other Editor')
  expect(screen.getByText(entry.name)).toBeTruthy()
  expect(screen.getByText(entry.path)).toBeTruthy()
  expect(screen.getByText('Your default application stays unchanged.')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  expect(onClose).toHaveBeenCalled()
  expect(filesystem.openWithApplication).not.toHaveBeenCalled()
})

it('keeps every application available in a long list', async () => {
  vi.mocked(filesystem.listApplications).mockResolvedValue(
    Array.from({ length: 40 }, (_, index) => ({ id: `app-${index}.desktop`, name: `App ${index}`, isDefault: index === 0 }))
  )
  const onClose = vi.fn()
  render(<OpenWithDialog entry={entry} language="en" onClose={onClose} />)
  const lastApp = await screen.findByRole('button', { name: 'App 39' })
  expect(lastApp.closest('.open-with-dialog__apps')).toBeTruthy()
  expect(screen.getByRole('searchbox', { name: 'Search applications…' })).toBeTruthy()
  fireEvent.click(lastApp)
  await waitFor(() => expect(onClose).toHaveBeenCalled())
  expect(filesystem.openWithApplication).toHaveBeenCalledWith(entry.path, 'app-39.desktop')
})
