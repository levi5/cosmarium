import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { STORAGE } from '../../constants/storage'
import { OrganizerProvider } from '../../lib/organizer'
import { PreferencesProvider } from '../../lib/preferences'
import { TaggedSections } from './TaggedSections'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

it('creates a section from selected tags, opens its items and edits or removes only the section', () => {
  localStorage.setItem(
    STORAGE.tags,
    JSON.stringify([
      { id: 'work', name: 'Trabalho', color: '#ffffff', emoji: '📁' },
      { id: 'personal', name: 'Pessoal', color: '#ffffff', emoji: '⭐' }
    ])
  )
  localStorage.setItem(STORAGE.taggedPaths, JSON.stringify({ '/report.pdf': ['work'], '/photo.jpg': ['personal'] }))
  const onOpen = vi.fn()
  render(
    <PreferencesProvider>
      <OrganizerProvider>
        <TaggedSections onOpen={onOpen} />
      </OrganizerProvider>
    </PreferencesProvider>
  )
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar seção' }))
  expect((screen.getByRole('button', { name: 'Salvar' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.change(screen.getByRole('textbox', { name: 'Nome da seção' }), { target: { value: 'Projetos' } })
  fireEvent.click(screen.getByRole('checkbox', { name: /Trabalho/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.queryByRole('button', { name: 'photo.jpg' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'report.pdf' }))
  expect(onOpen).toHaveBeenCalledWith('/report.pdf')
  fireEvent.click(screen.getByRole('button', { name: 'Projetos (1)' }))
  expect(screen.queryByRole('button', { name: 'report.pdf' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Editar seção: Projetos' }))
  fireEvent.click(screen.getByRole('checkbox', { name: /Pessoal/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(screen.getByRole('button', { name: 'Projetos (2)' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Editar seção: Projetos' }))
  fireEvent.click(screen.getByRole('button', { name: 'Remover seção' }))
  expect(screen.queryByRole('button', { name: /Projetos/ })).toBeNull()
  expect(JSON.parse(localStorage.getItem(STORAGE.taggedPaths) || '{}')).toEqual({ '/report.pdf': ['work'], '/photo.jpg': ['personal'] })
})
