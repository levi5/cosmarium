import { describe, expect, it } from 'vitest'
import { applySelectionRange, selectionRange } from './selection'

const paths = ['/a', '/b', '/c', '/d', '/e']

describe('selection ranges', () => {
  it('selects the inclusive range in display order', () => {
    expect(selectionRange(paths, '/b', '/d')).toEqual(['/b', '/c', '/d'])
    expect(selectionRange(paths, '/d', '/b')).toEqual(['/b', '/c', '/d'])
  })

  it('falls back to the target when the anchor is missing', () => {
    expect(selectionRange(paths, null, '/c')).toEqual(['/c'])
    expect(selectionRange(paths, '/gone', '/c')).toEqual(['/c'])
    expect(selectionRange(paths, '/a', '/gone')).toEqual([])
  })

  it('merges ranges only when additive', () => {
    expect(applySelectionRange(['/a'], ['/c', '/d'], false)).toEqual(['/c', '/d'])
    expect(applySelectionRange(['/a'], ['/c', '/d'], true)).toEqual(['/a', '/c', '/d'])
    expect(applySelectionRange(['/c'], ['/c', '/d'], true)).toEqual(['/c', '/d'])
  })
})
