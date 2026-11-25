import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { TRANSFER_NOTICE_TIMEOUT, useTransferStore } from '../../stores/transferStore'
import { TransferProgress } from '.'

vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn().mockResolvedValue(() => {}) }))

const labels = { copying: 'Copiando', moving: 'Movendo', trashing: 'Excluindo', cancel: 'Cancelar', close: 'Fechar', done: 'Concluído', failed: 'Falhou' }

beforeEach(() => {
  vi.useFakeTimers()
  useTransferStore.setState({ items: {}, dismissedIds: [], panelOpen: false })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('shows and copies the complete error including all lines', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('navigator', { clipboard: { writeText } })
  useTransferStore.getState().enqueue('a', false)
  useTransferStore.getState().finish('a', 'First error\nSecond error')
  const { getByRole, getByText } = render(<TransferProgress labels={labels} language="pt-BR" />)
  expect(getByText(/First error.*Second error/s)).toBeTruthy()
  await act(async () => fireEvent.click(getByRole('button', { name: 'Copiar mensagem' })))
  expect(writeText).toHaveBeenCalledWith('First error\nSecond error')
  expect(getByRole('button', { name: 'Copiado!' })).toBeTruthy()
})

it('keeps the original error visible if clipboard access fails', async () => {
  vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
  useTransferStore.getState().enqueue('a', false)
  useTransferStore.getState().finish('a', 'Original failure')
  const { getByRole, getByText } = render(<TransferProgress labels={labels} language="pt-BR" />)
  await act(async () => fireEvent.click(getByRole('button', { name: 'Copiar mensagem' })))
  expect(getByText('Falhou: Original failure')).toBeTruthy()
  expect(getByRole('status').textContent).toContain('Não foi possível copiar')
})

it('collapses active notices without removing operations and lets them reopen', () => {
  useTransferStore.getState().enqueue('a', false)
  const { queryByRole } = render(<TransferProgress labels={labels} language="pt-BR" />)
  expect(queryByRole('region')).not.toBeNull()
  expect(queryByRole('region')?.parentElement).toBe(document.body)
  expect(queryByRole('region')?.querySelector('.transfer-card')?.classList.contains('notification-surface')).toBe(true)
  act(() => vi.advanceTimersByTime(TRANSFER_NOTICE_TIMEOUT))
  expect(queryByRole('region')).toBeNull()
  expect(useTransferStore.getState().items.a.finished).toBe(false)
  act(() => useTransferStore.getState().setPanelOpen(true))
  expect(queryByRole('region')).not.toBeNull()
})

it('removes completed notices after the timeout even when the panel is collapsed', () => {
  useTransferStore.getState().enqueue('a', false)
  render(<TransferProgress labels={labels} language="pt-BR" />)
  act(() => useTransferStore.getState().setPanelOpen(false))
  act(() => useTransferStore.getState().finish('a', null))
  act(() => vi.advanceTimersByTime(TRANSFER_NOTICE_TIMEOUT - 1))
  expect(useTransferStore.getState().items.a).toBeDefined()
  act(() => vi.advanceTimersByTime(1))
  expect(useTransferStore.getState().items).toEqual({})
})

it('keeps failures visible until explicitly dismissed', () => {
  useTransferStore.getState().enqueue('a', false)
  const { getByRole, getByText } = render(<TransferProgress labels={labels} language="pt-BR" />)
  act(() => useTransferStore.getState().setPanelOpen(false))
  act(() => useTransferStore.getState().finish('a', 'Permission denied'))
  act(() => vi.advanceTimersByTime(TRANSFER_NOTICE_TIMEOUT * 3))
  expect(getByText('Falhou: Permission denied')).toBeTruthy()
  fireEvent.click(getByRole('button', { name: 'Fechar' }))
  expect(useTransferStore.getState().items).toEqual({})
})

it('does not collapse while hovered or focused', () => {
  useTransferStore.getState().enqueue('a', false)
  const { getByRole, queryByRole } = render(<TransferProgress labels={labels} language="pt-BR" />)
  fireEvent.pointerEnter(getByRole('region'))
  fireEvent.focus(getByRole('button', { name: 'Cancelar' }))
  fireEvent.pointerLeave(getByRole('region'))
  act(() => vi.advanceTimersByTime(TRANSFER_NOTICE_TIMEOUT * 2))
  expect(queryByRole('region')).not.toBeNull()
  fireEvent.blur(getByRole('button', { name: 'Cancelar' }), { relatedTarget: document.body })
  act(() => vi.advanceTimersByTime(TRANSFER_NOTICE_TIMEOUT))
  expect(queryByRole('region')).toBeNull()
})
