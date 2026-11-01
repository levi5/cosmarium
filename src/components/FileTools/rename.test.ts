import { describe, expect, it } from 'vitest'
import type { FileEntry } from '../../types/explorer'
import { planRename, validRenamePlan } from './rename'

const entries: FileEntry[] = ['photo.jpg', 'photo.png'].map((name) => ({
  name,
  path: `/pictures/${name}`,
  kind: 'file',
  size: 1,
  hidden: false,
  modified: null,
  accessed: null
}))

describe('batch rename', () => {
  it('previews replacements, prefixes and numbering without changing files', () => {
    expect(planRename(entries, { find: 'photo', replace: 'trip', prefix: 'new-', number: true })).toEqual([
      { path: '/pictures/photo.jpg', newName: 'new-1-trip.jpg' },
      { path: '/pictures/photo.png', newName: 'new-2-trip.png' }
    ])
    expect(entries[0].name).toBe('photo.jpg')
  })
  it('rejects duplicate and unsafe names', () => {
    expect(validRenamePlan([{ path: '/a', newName: '../escape' }])).toBe(false)
    expect(
      validRenamePlan([
        { path: '/a', newName: 'same' },
        { path: '/b', newName: 'same' }
      ])
    ).toBe(false)
    expect(validRenamePlan([])).toBe(false)
  })
})
