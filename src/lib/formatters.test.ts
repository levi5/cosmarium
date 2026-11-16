import { expect, it } from 'vitest'
import { formatDate, formatSize } from './formatters'

it.each(['pt-BR', 'en-US'])('preserves size formatting for %s', (language) => {
  expect(formatSize(0, language)).toBe('0 B')
  expect(formatSize(1024, language)).toBe('1 KB')
  expect(formatSize(1536, language)).toBe(`${new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(1.5)} KB`)
  expect(formatSize(1024 ** 2, language)).toBe('1 MB')
})

it.each(['pt-BR', 'en-US'])('preserves both date formats for %s', (language) => {
  const timestamp = 1_700_000_000
  const date = new Date(timestamp * 1000)
  expect(formatDate(null, language)).toBe('-')
  expect(formatDate(timestamp, language)).toBe(new Intl.DateTimeFormat(language, { dateStyle: 'short', timeStyle: 'medium' }).format(date))
  expect(formatDate(timestamp, language, false)).toBe(new Intl.DateTimeFormat(language, { dateStyle: 'short' }).format(date))
})
