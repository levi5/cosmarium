import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { OrganizerProvider } from '../../lib/organizer'
import { PreferencesProvider } from '../../lib/preferences'
import { filesystem } from '../../services/tauri/filesystem'
import { useClipboardStore } from '../../stores/clipboardStore'
import { useShortcutStore } from '../../stores/shortcutStore'
import type { FileEntry } from '../../types/explorer'
import type { FileTable } from '../FileBrowser/FileTable'
import { toolsApi } from '../FileTools/api'
import { SecondaryPane } from '.'

const primary = vi.hoisted(() => ({
  currentPath: '/primary',
  entries: [],
  refresh: vi.fn(),
  createFolder: vi.fn(),
  createFile: vi.fn(),
  removeEntries: vi.fn(),
  replaceEntry: vi.fn()
}))

vi.mock('../../lib/files', () => ({ useFileWorkspace: () => primary }))
vi.mock('../../hooks/useDirectoryWatch', () => ({ useDirectoryWatch: () => null }))
vi.mock('../../hooks/useFolderSizes', () => ({ useFolderSizes: () => ({}) }))
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(async () => () => {}) }))
vi.mock('../PreviewPane', () => ({ PreviewPane: () => null }))
vi.mock('../PropertiesDialog', () => ({ PropertiesDialog: () => null }))
vi.mock('../FileTools/api', () => ({ toolsApi: { openTerminal: vi.fn(async () => {}) } }))
vi.mock('../../services/tauri/filesystem', () => ({
  filesystem: {
    listDirectory: vi.fn(),
    createDirectory: vi.fn(),
    createFile: vi.fn(),
    renameEntry: vi.fn(),
    recordCreated: vi.fn(),
    recordRename: vi.fn(),
    trashEntries: vi.fn(),
    deleteEntries: vi.fn(),
    openWithDefault: vi.fn(),
    listApplications: vi.fn(),
    openWithApplication: vi.fn(),
    readTextPreview: vi.fn()
  }
}))
vi.mock('../FileBrowser/FileTable', () => ({
  FileTable: (p: ComponentProps<typeof FileTable>) => (
    <div data-testid="files" data-view={p.view}>
      {p.rows.map((row) => (
        <button
          type="button"
          key={row.entry.path}
          aria-pressed={row.isSelected}
          onClick={(event) => p.onSelect(event, row.entry)}
          onContextMenu={(event) => p.onContextMenu(event, row.entry)}
        >
          {row.entry.name}
          {row.tags.map((tag) => ` [${tag.name}]`).join('')}
        </button>
      ))}
    </div>
  )
}))

const file: FileEntry = { name: 'note.txt', path: '/secondary/note.txt', kind: 'file', size: 12, modified: null, accessed: null, hidden: false }

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(filesystem.listDirectory).mockResolvedValue([file])
  vi.mocked(filesystem.readTextPreview).mockResolvedValue({ text: 'hello', isText: true, truncated: false, size: 5 })
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  useShortcutStore.getState().resetAll()
  vi.unstubAllGlobals()
  useClipboardStore.getState().clear()
  localStorage.clear()
})

async function setup() {
  const onTransfer = vi.fn(async () => {})
  render(
    <PreferencesProvider>
      <OrganizerProvider>
        <SecondaryPane initialPath="/secondary" primaryPath="/primary" primarySources={[]} onChanged={vi.fn()} onTransfer={onTransfer} />
      </OrganizerProvider>
    </PreferencesProvider>
  )
  await screen.findByRole('button', { name: 'note.txt' })
  return { onTransfer, region: screen.getByRole('region', { name: '/secondary' }) }
}

it('renames a secondary entry without changing primary entries', async () => {
  vi.mocked(filesystem.renameEntry).mockResolvedValue({ ...file, name: 'renamed.txt', path: '/secondary/renamed.txt' })
  await setup()
  fireEvent.contextMenu(screen.getByRole('button', { name: 'note.txt' }))
  fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Renomear' }))
  fireEvent.change(within(screen.getByRole('dialog')).getByRole('textbox'), { target: { value: 'renamed.txt' } })
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Renomear' }))
  await screen.findByRole('button', { name: 'renamed.txt' })
  expect(filesystem.renameEntry).toHaveBeenCalledWith(file.path, 'renamed.txt')
  expect(filesystem.recordRename).toHaveBeenCalledWith(file.path, '/secondary/renamed.txt')
  expect(primary.replaceEntry).not.toHaveBeenCalled()
})

it('shows and closes details inside the same responsive content area as the listing', async () => {
  const { region } = await setup()
  fireEvent.click(screen.getByRole('button', { name: 'note.txt' }))
  fireEvent.contextMenu(region)
  fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Mostrar painel de detalhes' }))
  const details = screen.getByRole('complementary', { name: 'Painel de detalhes' })
  expect(details.parentElement).toBe(region.parentElement)
  expect(details.parentElement?.classList.contains('workspace-pane__content')).toBe(true)
  expect(within(details).getByText('note.txt')).toBeTruthy()
  fireEvent.click(within(details).getByRole('button', { name: 'Fechar painel' }))
  expect(screen.queryByRole('complementary', { name: 'Painel de detalhes' })).toBeNull()
})

it('hides the details option and ignores its shortcut without a selection', async () => {
  const { region } = await setup()
  fireEvent.contextMenu(region)
  expect(within(screen.getByRole('menu')).queryByText('Mostrar painel de detalhes')).toBeNull()
  fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
  fireEvent.keyDown(region, { key: 'e', ctrlKey: true })
  expect(screen.queryByRole('complementary', { name: 'Painel de detalhes' })).toBeNull()
})

it('hides details when the last item is deselected', async () => {
  const { region } = await setup()
  const fileButton = screen.getByRole('button', { name: 'note.txt' })
  fireEvent.click(fileButton)
  fireEvent.keyDown(region, { key: 'e', ctrlKey: true })
  expect(screen.getByRole('complementary', { name: 'Painel de detalhes' })).toBeTruthy()
  fireEvent.click(fileButton, { ctrlKey: true })
  expect(screen.queryByRole('complementary', { name: 'Painel de detalhes' })).toBeNull()
  fireEvent.contextMenu(region)
  expect(within(screen.getByRole('menu')).queryByText('Mostrar painel de detalhes')).toBeNull()
})

it('selects a range with shift+click in the secondary pane', async () => {
  const other: FileEntry = { ...file, name: 'other.txt', path: '/secondary/other.txt' }
  const third: FileEntry = { ...file, name: 'third.txt', path: '/secondary/third.txt' }
  vi.mocked(filesystem.listDirectory).mockResolvedValue([file, other, third])
  await setup()
  fireEvent.click(screen.getByRole('button', { name: 'note.txt' }))
  fireEvent.click(screen.getByRole('button', { name: 'third.txt' }), { shiftKey: true })
  expect(screen.getByRole('button', { name: 'note.txt' }).getAttribute('aria-pressed')).toBe('true')
  expect(screen.getByRole('button', { name: 'other.txt' }).getAttribute('aria-pressed')).toBe('true')
  expect(screen.getByRole('button', { name: 'third.txt' }).getAttribute('aria-pressed')).toBe('true')
})

it('creates files in the secondary folder from its background menu', async () => {
  vi.mocked(filesystem.createFile).mockResolvedValue({ ...file, name: 'new.txt', path: '/secondary/new.txt' })
  const { region } = await setup()
  fireEvent.contextMenu(region)
  fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Novo arquivo' }))
  fireEvent.change(within(screen.getByRole('dialog')).getByRole('textbox'), { target: { value: 'new.txt' } })
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Criar' }))
  await screen.findByRole('button', { name: 'new.txt' })
  expect(filesystem.createFile).toHaveBeenCalledWith('/secondary', 'new.txt')
  expect(primary.createFile).not.toHaveBeenCalled()
})

it.each([
  ['Abrir terminal', undefined],
  ['Abrir terminal como root', true]
])('opens the current folder with %s', async (label, asRoot) => {
  const { region } = await setup()
  fireEvent.contextMenu(region)
  fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: label }))
  expect(toolsApi.openTerminal).toHaveBeenCalledWith('/secondary', ...(asRoot ? [true] : []))
  expect(screen.queryByRole('menu')).toBeNull()
})

it.each([
  ['Abrir terminal', undefined],
  ['Abrir terminal como root', true]
])('opens a selected folder with %s', async (label, asRoot) => {
  const folder: FileEntry = { ...file, name: 'folder', path: '/secondary/folder', kind: 'directory' }
  vi.mocked(filesystem.listDirectory).mockResolvedValue([file, folder])
  await setup()
  fireEvent.contextMenu(screen.getByRole('button', { name: 'folder' }))
  fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: label }))
  expect(toolsApi.openTerminal).toHaveBeenCalledWith(folder.path, ...(asRoot ? [true] : []))
  expect(screen.queryByRole('menu')).toBeNull()
})

it('does not offer terminal actions on files', async () => {
  await setup()
  fireEvent.contextMenu(screen.getByRole('button', { name: 'note.txt' }))
  expect(within(screen.getByRole('menu')).queryByRole('menuitem', { name: /Abrir terminal/ })).toBeNull()
})

it('creates and displays tags for secondary entries', async () => {
  await setup()
  fireEvent.contextMenu(screen.getByRole('button', { name: 'note.txt' }))
  fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Adicionar etiqueta' }))
  fireEvent.change(within(screen.getByRole('dialog')).getByRole('textbox'), { target: { value: 'Work' } })
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Salvar' }))
  await screen.findByRole('button', { name: 'note.txt [Work]' })
})

it('prunes selection and focus after a refresh removes an entry', async () => {
  const { region, onTransfer } = await setup()
  fireEvent.click(screen.getByRole('button', { name: 'note.txt' }))
  vi.mocked(filesystem.listDirectory).mockResolvedValue([])
  fireEvent.contextMenu(region)
  fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Atualizar' }))
  await waitFor(() => expect(screen.queryByRole('button', { name: 'note.txt' })).toBeNull())
  act(() => useClipboardStore.getState().setClipboard('copy', ['/keep.txt']))
  fireEvent.keyDown(region, { key: 'c', ctrlKey: true })
  fireEvent.keyDown(region, { key: 'F2' })
  expect(useClipboardStore.getState().paths).toEqual(['/keep.txt'])
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(onTransfer).not.toHaveBeenCalled()
})

it('shows rejected rename errors without closing the prompt', async () => {
  vi.mocked(filesystem.renameEntry).mockRejectedValue('Permission denied')
  const { region } = await setup()
  fireEvent.click(screen.getByRole('button', { name: 'note.txt' }))
  fireEvent.keyDown(region, { key: 'F2' })
  fireEvent.change(within(screen.getByRole('dialog')).getByRole('textbox'), { target: { value: 'renamed.txt' } })
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Renomear' }))
  await screen.findByText('Permission denied')
  expect(screen.getByRole('dialog')).toBeTruthy()
  expect(primary.replaceEntry).not.toHaveBeenCalled()
})

it('deletes secondary entries only after confirmation', async () => {
  const { region } = await setup()
  vi.mocked(filesystem.trashEntries).mockResolvedValue({ removed: [file.path], cancelled: false, errors: [] })
  vi.mocked(filesystem.listDirectory).mockResolvedValue([])
  fireEvent.click(screen.getByRole('button', { name: 'note.txt' }))
  fireEvent.keyDown(region, { key: 'Delete' })
  expect(filesystem.trashEntries).not.toHaveBeenCalled()
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Mover para a lixeira' }))
  await waitFor(() => expect(filesystem.trashEntries).toHaveBeenCalledWith([file.path], expect.any(String)))
  await waitFor(() => expect(screen.queryByRole('button', { name: 'note.txt' })).toBeNull())
  expect(primary.removeEntries).not.toHaveBeenCalled()
})

it('permanently deletes only after confirmation without using trash', async () => {
  const { region } = await setup()
  vi.mocked(filesystem.deleteEntries).mockResolvedValue({ removed: [file.path], cancelled: false, errors: [] })
  vi.mocked(filesystem.listDirectory).mockResolvedValue([])
  fireEvent.click(screen.getByRole('button', { name: 'note.txt' }))
  fireEvent.keyDown(region, { key: 'Delete', shiftKey: true })
  expect(filesystem.deleteEntries).not.toHaveBeenCalled()
  expect(screen.getByRole('dialog').textContent).toContain('Esta ação não pode ser desfeita.')
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir permanentemente' }))
  await waitFor(() => expect(filesystem.deleteEntries).toHaveBeenCalledWith([file.path]))
  expect(filesystem.trashEntries).not.toHaveBeenCalled()
  await waitFor(() => expect(screen.queryByRole('button', { name: 'note.txt' })).toBeNull())
  expect(primary.removeEntries).not.toHaveBeenCalled()
})

it('cancels permanent deletion from the context menu', async () => {
  await setup()
  fireEvent.contextMenu(screen.getByRole('button', { name: 'note.txt' }))
  const menu = screen.getByRole('menu')
  expect(within(menu).getByText('Mover para a lixeira')).toBeTruthy()
  fireEvent.click(within(menu).getByText('Excluir permanentemente'))
  fireEvent.click(within(screen.getByRole('dialog')).getAllByRole('button', { name: 'Cancelar' })[0])
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(filesystem.deleteEntries).not.toHaveBeenCalled()
  expect(filesystem.trashEntries).not.toHaveBeenCalled()
})

it('keeps keyboard navigation and Escape working in secondary menus', async () => {
  await setup()
  fireEvent.contextMenu(screen.getByRole('button', { name: 'note.txt' }))
  const items = within(screen.getByRole('menu')).getAllByRole('menuitem')
  expect(document.activeElement).toBe(items[0])
  fireEvent.keyDown(items[0], { key: 'ArrowDown' })
  expect(document.activeElement).toBe(items[1])
  fireEvent.keyDown(items[1], { key: 'Escape' })
  expect(screen.queryByRole('menu')).toBeNull()
})

it('opens the application chooser from the secondary file menu', async () => {
  vi.mocked(filesystem.listApplications).mockResolvedValue([{ id: 'editor.desktop', name: 'Text Editor', isDefault: true }])
  await setup()
  fireEvent.contextMenu(screen.getByRole('button', { name: 'note.txt' }))
  fireEvent.click(within(screen.getByRole('menu')).getByText('Abrir com…'))
  expect(await screen.findByRole('button', { name: 'Text Editor Padrão' })).toBeTruthy()
  expect(filesystem.listApplications).toHaveBeenCalledWith(file.path)
})

it('pastes into the secondary path and displays transfer failures', async () => {
  const { region, onTransfer } = await setup()
  act(() => useClipboardStore.getState().setClipboard('cut', ['/source.txt']))
  onTransfer.mockRejectedValueOnce(new Error('Transfer failed'))
  fireEvent.keyDown(region, { key: 'v', ctrlKey: true })
  await screen.findByRole('alert')
  expect(screen.getByRole('alert').textContent).toBe('Transfer failed')
  expect(onTransfer).toHaveBeenCalledWith(['/source.txt'], '/secondary', true)
})

it('honors customized rename, copy, and delete bindings instead of fixed keys', async () => {
  useShortcutStore.getState().setBinding('rename', 'ctrl+r')
  useShortcutStore.getState().setBinding('copy', 'ctrl+shift+c')
  useShortcutStore.getState().setBinding('delete', 'ctrl+shift+d')
  const { region } = await setup()
  fireEvent.click(screen.getByRole('button', { name: 'note.txt' }))
  fireEvent.keyDown(region, { key: 'F2' })
  fireEvent.keyDown(region, { key: 'Delete' })
  fireEvent.keyDown(region, { key: 'c', ctrlKey: true })
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(useClipboardStore.getState().paths).toEqual([])
  fireEvent.keyDown(region, { key: 'c', ctrlKey: true, shiftKey: true })
  expect(useClipboardStore.getState().paths).toEqual([file.path])
  fireEvent.keyDown(region, { key: 'r', ctrlKey: true })
  expect(within(screen.getByRole('dialog')).getByRole('textbox').getAttribute('aria-label')).toBe('Renomear')
  fireEvent.click(within(screen.getByRole('dialog')).getAllByRole('button', { name: 'Cancelar' })[0])
  fireEvent.keyDown(region, { key: 'd', ctrlKey: true, shiftKey: true })
  expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Mover para a lixeira' })).toBeTruthy()
  expect(filesystem.trashEntries).not.toHaveBeenCalled()
})

it('preserves text editing when file shortcuts are pressed in an input', async () => {
  await setup()
  fireEvent.click(screen.getByRole('button', { name: 'note.txt' }))
  const input = screen.getByRole('textbox', { name: 'Caminho da pasta' })
  fireEvent.keyDown(input, { key: 'F2' })
  fireEvent.keyDown(input, { key: 'Delete' })
  fireEvent.keyDown(input, { key: 'c', ctrlKey: true })
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(useClipboardStore.getState().paths).toEqual([])
})

it('reports undo failure without reopening a rename prompt for the old path', async () => {
  vi.mocked(filesystem.renameEntry).mockResolvedValue({ ...file, name: 'renamed.txt', path: '/secondary/renamed.txt' })
  vi.mocked(filesystem.recordRename).mockRejectedValueOnce('Undo storage unavailable')
  const { region } = await setup()
  fireEvent.click(screen.getByRole('button', { name: 'note.txt' }))
  fireEvent.keyDown(region, { key: 'F2' })
  fireEvent.change(within(screen.getByRole('dialog')).getByRole('textbox'), { target: { value: 'renamed.txt' } })
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Renomear' }))
  await screen.findByText(/O item foi renomeado, mas não foi possível registrar/)
  expect(screen.getByRole('button', { name: 'renamed.txt' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'note.txt' })).toBeNull()
  expect(within(screen.getByRole('dialog')).queryByRole('textbox')).toBeNull()
  expect(filesystem.renameEntry).toHaveBeenCalledTimes(1)
})

it('updates transfer labels and toolbar orientation when panels become stacked', async () => {
  const listeners = new Set<() => void>()
  const media = {
    matches: false,
    addEventListener: (_event: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_event: string, listener: () => void) => listeners.delete(listener)
  }
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => media)
  )
  await setup()
  const toolbar = screen.getByRole('toolbar', { name: 'Painel duplo' })
  expect(toolbar.getAttribute('aria-orientation')).toBe('vertical')
  expect(screen.getByRole('button', { name: 'Copiar do painel esquerdo para o direito' })).toBeTruthy()
  act(() => {
    media.matches = true
    for (const listener of listeners) listener()
  })
  expect(toolbar.getAttribute('aria-orientation')).toBe('horizontal')
  expect(screen.getByRole('button', { name: 'Copiar do painel superior para o inferior' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Copiar do painel esquerdo para o direito' })).toBeNull()
})
