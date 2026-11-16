import { SIZE_BASE, SIZE_UNITS } from '../constants/files'

const CACHE_LIMIT = 8
const locales = new Map<string, { number: Intl.NumberFormat; date: Intl.DateTimeFormat; dateTime: Intl.DateTimeFormat }>()

function formatters(language: string) {
  const cached = locales.get(language)
  if (cached) return cached
  const created = {
    number: new Intl.NumberFormat(language, { maximumFractionDigits: 1 }),
    date: new Intl.DateTimeFormat(language, { dateStyle: 'short' }),
    dateTime: new Intl.DateTimeFormat(language, { dateStyle: 'short', timeStyle: 'medium' })
  }
  locales.set(language, created)
  if (locales.size > CACHE_LIMIT) locales.delete(locales.keys().next().value as string)
  return created
}

export function formatSize(size: number, language: string): string {
  if (!size) return `0 ${SIZE_UNITS[0]}`
  const index = Math.min(Math.floor(Math.log(size) / Math.log(SIZE_BASE)), SIZE_UNITS.length - 1)
  return `${formatters(language).number.format(size / SIZE_BASE ** index)} ${SIZE_UNITS[index]}`
}

export function formatDate(timestamp: number | null, language: string, withTime = true): string {
  if (!timestamp) return '-'
  const locale = formatters(language)
  return (withTime ? locale.dateTime : locale.date).format(new Date(timestamp * 1000))
}
