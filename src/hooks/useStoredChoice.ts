import { useEffect, useState } from 'react'

export function useStoredChoice<T extends string>(key: string, choices: readonly T[], fallback: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      return choices.includes(stored as T) ? (stored as T) : fallback
    } catch {
      return fallback
    }
  })
  useEffect(() => {
    localStorage.setItem(key, value)
  }, [key, value])
  return [value, setValue] as const
}
