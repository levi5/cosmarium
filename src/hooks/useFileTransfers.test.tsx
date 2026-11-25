import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { filesystem } from '../services/tauri/filesystem'
import { transferEntries } from '../services/transfers'
import { useProductivityStore } from '../stores/productivityStore'
import { useFileTransfers } from './useFileTransfers'

const workspace = vi.hoisted(() => ({ currentPath: '/docs', refresh: vi.fn(), removeEntries: vi.fn() }))
vi.mock('../lib/files', () => ({ useFileWorkspace: () => workspace }))
vi.mock('../lib/organizer', () => ({ useOrganizer: () => ({ moveTag: vi.fn() }) }))
vi.mock('../services/tauri/filesystem', () => ({ filesystem: { scanTransfer: vi.fn() } }))
vi.mock('../services/transfers', () => ({ transferEntries: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
  useProductivityStore.setState({ rehearsal: true })
  vi.mocked(filesystem.scanTransfer).mockResolvedValue({ files: 1, bytes: 20, conflicts: [] })
  vi.mocked(transferEntries).mockResolvedValue({ copied: 1, skipped: 0, cancelled: false, touched: [], errors: [] })
})
afterEach(cleanup)
const titles = { copying: 'Copying', moving: 'Moving' }

it('does not mutate anything while rehearsing or after cancelling', async () => {
  const { result } = renderHook(() => useFileTransfers(titles, vi.fn()))
  await act(async () => result.current.doDrop(['/docs/a'], '/backup', true))
  expect(result.current.rehearsalState?.sources).toEqual(['/docs/a'])
  expect(transferEntries).not.toHaveBeenCalled()
  expect(workspace.removeEntries).not.toHaveBeenCalled()
  act(() => result.current.setRehearsalState(null))
  expect(transferEntries).not.toHaveBeenCalled()
})

it('executes a conflict-free plan only after confirmation', async () => {
  const { result } = renderHook(() => useFileTransfers(titles, vi.fn()))
  await act(async () => result.current.doDrop(['/docs/a'], '/backup', false))
  await act(async () => result.current.confirmRehearsal())
  expect(transferEntries).toHaveBeenCalledWith(expect.any(String), ['/docs/a'], '/backup', false, [], false)
  expect(result.current.rehearsalState).toBeNull()
})

it('preserves conflict resolution after rehearsal', async () => {
  vi.mocked(filesystem.scanTransfer).mockResolvedValue({ files: 1, bytes: 20, conflicts: [{ name: 'a', is_dir: false }] })
  const { result } = renderHook(() => useFileTransfers(titles, vi.fn()))
  await act(async () => result.current.doDrop(['/docs/a'], '/backup', true))
  expect(result.current.conflictState).toBeNull()
  act(() => result.current.confirmRehearsal())
  expect(result.current.conflictState?.scan.conflicts).toHaveLength(1)
  expect(transferEntries).not.toHaveBeenCalled()
})

it('retains direct transfers when rehearsal is disabled', async () => {
  useProductivityStore.setState({ rehearsal: false })
  const { result } = renderHook(() => useFileTransfers(titles, vi.fn()))
  await act(async () => result.current.doDrop(['/docs/a'], '/backup', false))
  expect(transferEntries).toHaveBeenCalledOnce()
  expect(result.current.rehearsalState).toBeNull()
})

it('reports scan failures without creating a plan or starting a transfer', async () => {
  vi.mocked(filesystem.scanTransfer).mockRejectedValue('Permission denied')
  const notice = vi.fn()
  const { result } = renderHook(() => useFileTransfers(titles, notice))
  await act(async () => result.current.doDrop(['/docs/a'], '/backup', false))
  expect(notice).toHaveBeenCalledWith({ title: 'Copying', message: 'Permission denied' })
  expect(result.current.rehearsalState).toBeNull()
  expect(transferEntries).not.toHaveBeenCalled()
})

it('offers name correction before copying and cancelling does not write anything', async () => {
  useProductivityStore.setState({ rehearsal: false })
  vi.mocked(filesystem.scanTransfer).mockResolvedValue({
    files: 1,
    bytes: 20,
    conflicts: [],
    name_changes: [{ source: '/docs/Terreno ', suggested_name: 'Terreno' }]
  })
  const { result } = renderHook(() => useFileTransfers(titles, vi.fn()))
  await act(async () => result.current.doDrop(['/docs/Terreno '], '/ssd', false))
  expect(result.current.nameCorrectionState?.scan.name_changes).toHaveLength(1)
  expect(transferEntries).not.toHaveBeenCalled()
  act(() => result.current.setNameCorrectionState(null))
  expect(transferEntries).not.toHaveBeenCalled()
})

it('rechecks corrected names and routes collisions to the existing conflict modal', async () => {
  useProductivityStore.setState({ rehearsal: false })
  vi.mocked(filesystem.scanTransfer)
    .mockResolvedValueOnce({ files: 1, bytes: 20, conflicts: [], name_changes: [{ source: '/docs/Terreno ', suggested_name: 'Terreno' }] })
    .mockResolvedValueOnce({ files: 1, bytes: 20, conflicts: [{ name: 'Terreno ', destination_name: 'Terreno', is_dir: true }] })
  const { result } = renderHook(() => useFileTransfers(titles, vi.fn()))
  await act(async () => result.current.doDrop(['/docs/Terreno '], '/ssd', false))
  await act(async () => result.current.confirmNameCorrection())
  expect(filesystem.scanTransfer).toHaveBeenLastCalledWith(['/docs/Terreno '], '/ssd', true)
  expect(result.current.nameCorrectionState).toBeNull()
  expect(result.current.conflictState?.fixNames).toBe(true)
  expect(result.current.conflictState?.scan.conflicts[0].destination_name).toBe('Terreno')
  expect(transferEntries).not.toHaveBeenCalled()
})

it('copies with corrected names only after consent when there is no collision', async () => {
  useProductivityStore.setState({ rehearsal: false })
  vi.mocked(filesystem.scanTransfer)
    .mockResolvedValueOnce({ files: 1, bytes: 20, conflicts: [], name_changes: [{ source: '/docs/Terreno ', suggested_name: 'Terreno' }] })
    .mockResolvedValueOnce({ files: 1, bytes: 20, conflicts: [] })
  const { result } = renderHook(() => useFileTransfers(titles, vi.fn()))
  await act(async () => result.current.doDrop(['/docs/Terreno '], '/ssd', false))
  await act(async () => result.current.confirmNameCorrection())
  expect(transferEntries).toHaveBeenCalledWith(expect.any(String), ['/docs/Terreno '], '/ssd', false, [], true)
})

it('preserves name correction consent through rehearsal', async () => {
  vi.mocked(filesystem.scanTransfer)
    .mockResolvedValueOnce({ files: 1, bytes: 20, conflicts: [], name_changes: [{ source: '/docs/Terreno ', suggested_name: 'Terreno' }] })
    .mockResolvedValueOnce({ files: 1, bytes: 20, conflicts: [] })
  const { result } = renderHook(() => useFileTransfers(titles, vi.fn()))
  await act(async () => result.current.doDrop(['/docs/Terreno '], '/ssd', false))
  await act(async () => result.current.confirmNameCorrection())
  expect(transferEntries).not.toHaveBeenCalled()
  await act(async () => result.current.confirmRehearsal())
  expect(transferEntries).toHaveBeenCalledWith(expect.any(String), ['/docs/Terreno '], '/ssd', false, [], true)
})

it('does not offer copy-only name correction for moves', async () => {
  useProductivityStore.setState({ rehearsal: false })
  vi.mocked(filesystem.scanTransfer).mockResolvedValue({
    files: 1,
    bytes: 20,
    conflicts: [],
    name_changes: [{ source: '/docs/Terreno ', suggested_name: 'Terreno' }]
  })
  const { result } = renderHook(() => useFileTransfers(titles, vi.fn()))
  await act(async () => result.current.doDrop(['/docs/Terreno '], '/ssd', true))
  expect(result.current.nameCorrectionState).toBeNull()
  expect(transferEntries).toHaveBeenCalledWith(expect.any(String), ['/docs/Terreno '], '/ssd', true, [], false)
})

it('does not start a copy if rescanning corrected names fails', async () => {
  useProductivityStore.setState({ rehearsal: false })
  vi.mocked(filesystem.scanTransfer)
    .mockResolvedValueOnce({ files: 1, bytes: 20, conflicts: [], name_changes: [{ source: '/docs/Terreno ', suggested_name: 'Terreno' }] })
    .mockRejectedValueOnce('SSD disconnected')
  const notice = vi.fn()
  const { result } = renderHook(() => useFileTransfers(titles, notice))
  await act(async () => result.current.doDrop(['/docs/Terreno '], '/ssd', false))
  await act(async () => result.current.confirmNameCorrection())
  expect(transferEntries).not.toHaveBeenCalled()
  expect(notice).toHaveBeenCalledWith({ title: 'Copying', message: 'SSD disconnected' })
})
