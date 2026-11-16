import { expect, it } from 'vitest'
import type { FileEntry } from '../types/explorer'
import { fileRows } from './fileRows'

it('preserves entry order, tags and independent active/selected states', () => {
  const entries: FileEntry[] = ['a', 'b', 'c'].map((name) => ({
    name,
    path: `/${name}`,
    kind: 'file',
    size: 0,
    modified: null,
    accessed: null,
    hidden: false
  }))
  const rows = fileRows(entries, ['/a', '/c'], '/b', () => [])
  expect(rows.map((row) => row.entry)).toEqual(entries)
  expect(rows.map((row) => row.isSelected)).toEqual([true, false, true])
  expect(rows.map((row) => row.isActive)).toEqual([false, true, false])
  expect(rows.every((row) => row.tags.length === 0)).toBe(true)
})
