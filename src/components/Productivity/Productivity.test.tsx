import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useProductivityStore, type WorkspaceSnapshot } from '../../stores/productivityStore'
import { Productivity } from '.'
import { TransferRehearsal } from './TransferRehearsal'

const snapshot: WorkspaceSnapshot = {
  paths: ['/docs'],
  activeIndex: 0,
  view: 'list',
  sortKey: 'name',
  sortDirection: 'asc',
  query: 'ext:pdf',
  detailsPane: false,
  split: false,
  secondaryPath: '/docs',
  showHidden: false
}
beforeEach(() => {
  useProductivityStore.setState({ rehearsal: false, workspaces: [], folders: [] })
})
afterEach(cleanup)

it('saves and opens workspaces and virtual rules from the dialog', () => {
  const onWorkspace = vi.fn()
  const onFolder = vi.fn()
  const onClose = vi.fn()
  render(<Productivity language="en" root="/docs" query="ext:pdf" snapshot={() => snapshot} onWorkspace={onWorkspace} onFolder={onFolder} onClose={onClose} />)
  expect(screen.getByRole('heading', { name: 'Organization', level: 2 })).toBeTruthy()
  fireEvent.click(screen.getByRole('switch', { name: 'Rehearsal mode' }))
  expect(useProductivityStore.getState().rehearsal).toBe(true)
  fireEvent.change(screen.getAllByLabelText('Name')[0], { target: { value: 'Work' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save current workspace' }))
  fireEvent.click(screen.getByRole('button', { name: 'Open: Work' }))
  expect(onWorkspace).toHaveBeenCalledWith(expect.objectContaining({ name: 'Work', snapshot }))
  expect(onClose).toHaveBeenCalledOnce()
  fireEvent.change(screen.getAllByLabelText('Name')[1], { target: { value: 'PDF collection' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create virtual folder' }))
  fireEvent.click(screen.getByRole('button', { name: 'Open: PDF collection' }))
  expect(onFolder).toHaveBeenCalledWith(expect.objectContaining({ name: 'PDF collection', root: '/docs', query: 'ext:pdf' }))
  fireEvent.click(screen.getByRole('button', { name: 'Remove: PDF collection' }))
  expect(useProductivityStore.getState().folders).toEqual([])
})

it('shows a read-only transfer plan and only confirms on explicit action', () => {
  const onConfirm = vi.fn()
  const onClose = vi.fn()
  render(
    <TransferRehearsal
      language="en"
      plan={{ sources: ['/docs/a.txt'], dest: '/backup', cut: true, scan: { files: 1, bytes: 512, conflicts: [] } }}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  )
  expect(screen.getByText('Nothing has changed. Review the plan and confirm to execute.')).toBeTruthy()
  expect(screen.getByText('/docs/a.txt → /backup')).toBeTruthy()
  expect(onConfirm).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(onClose).toHaveBeenCalledOnce()
  expect(onConfirm).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Execute transfer' }))
  expect(onConfirm).toHaveBeenCalledOnce()
})

it('shows saved lists and rule guidance without changing files', () => {
  useProductivityStore.getState().saveWorkspace('Work', snapshot)
  const onClose = vi.fn()
  render(<Productivity language="en" root="/docs" query="ext:pdf" snapshot={() => snapshot} onWorkspace={vi.fn()} onFolder={vi.fn()} onClose={onClose} />)
  expect(screen.getByRole('list', { name: 'Saved workspaces' }).textContent).toContain('Work')
  expect(screen.getByRole('list', { name: 'Saved folders' })).toBeTruthy()
  expect(screen.getByText('Organize without moving or duplicating your files.')).toBeTruthy()
  const rules = screen.getByText('How to write rules').closest('details')
  expect(rules?.open).toBe(false)
  fireEvent.click(screen.getByText('How to write rules'))
  expect(rules?.open).toBe(true)
  fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0])
  expect(onClose).toHaveBeenCalledOnce()
})

it('routes conflicting plans to conflict review', () => {
  render(
    <TransferRehearsal
      language="en"
      plan={{ sources: ['/a.txt'], dest: '/backup', cut: false, scan: { files: 1, bytes: 1, conflicts: [{ name: 'a.txt', is_dir: false }] } }}
      onConfirm={vi.fn()}
      onClose={vi.fn()}
    />
  )
  expect(screen.getByRole('button', { name: 'Review conflicts' })).toBeTruthy()
})
