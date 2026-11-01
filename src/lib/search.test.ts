import { describe, expect, it } from 'vitest'
import type { FileEntry } from '../types/explorer'
import { filterEntries, parseQuery, sortEntries } from './search'

const entry = (name: string, size: number, modified = 100, kind: FileEntry['kind'] = 'file'): FileEntry => ({
  name,
  path: `/tmp/${name}`,
  kind,
  size,
  modified,
  accessed: null,
  hidden: name.startsWith('.')
})

describe('search queries', () => {
  it('parses size, date, kind, extension and content filters', () => {
    expect(parseQuery('report ext:pdf maxsize:10mb size:1kb after:2026-01-01 before:2026-12-31 content:hello type:file')).toMatchObject({
      text: 'report',
      extensions: ['pdf'],
      minSize: 1024,
      maxSize: 10485760,
      content: 'hello',
      kind: 'file',
      modifiedAfter: 1767225600,
      modifiedBefore: 1798761599
    })
  })
  it('keeps invalid filters as text instead of silently dropping them', () => {
    expect(parseQuery('before:2026-02-31 maxsize:nope strange:value').text).toBe('before:2026-02-31 maxsize:nope strange:value')
  })
  it('filters hidden entries and size bounds', () => {
    const entries = [entry('small.txt', 10), entry('large.txt', 1000), entry('.secret.txt', 100)]
    expect(filterEntries(entries, parseQuery('size:50 maxsize:500'))).toEqual([])
    expect(filterEntries(entries, parseQuery('size:50 maxsize:500 hidden:true'))).toEqual([entries[2]])
  })
  it('keeps directories first and sorts names naturally without mutating input', () => {
    const entries = [entry('10.txt', 10), entry('2.txt', 2), entry('folder', 0, 100, 'directory')]
    expect(sortEntries(entries, 'name', 'asc').map((item) => item.name)).toEqual(['folder', '2.txt', '10.txt'])
    expect(entries[0].name).toBe('10.txt')
  })
})
