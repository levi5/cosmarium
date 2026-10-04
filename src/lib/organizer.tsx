import { createContext, useContext, useEffect, useState } from 'react'
import { STORAGE, writeStorage } from '../constants/storage'

export type Tag = { id: string; name: string; color: string; emoji: string }
export type QuickAccessItem = { path: string; name: string }

type Organizer = {
  tags: Tag[]
  quickAccess: QuickAccessItem[]
  taggedPaths: Record<string, string[]>
  createTag: (tag: Omit<Tag, 'id'>) => Tag
  assignTag: (path: string, tagId: string) => void
  unassignTag: (path: string, tagId: string) => void
  moveTag: (from: string, to: string) => void
  removeTag: (tagId: string) => void
  addQuickAccess: (item: QuickAccessItem) => void
  removeQuickAccess: (path: string) => void
}

const OrganizerContext = createContext<Organizer | null>(null)
const read = <T,>(key: string, fallback: T): T => {
  try {
    return JSON.parse(localStorage.getItem(key) || '') as T
  } catch {
    return fallback
  }
}

function newTagId(name: string): string {
  let unique: string
  try {
    unique = crypto.randomUUID()
  } catch {
    unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }
  return `${unique}-${name}`
}

export function OrganizerProvider({ children }: { children: React.ReactNode }) {
  const [tags, setTags] = useState<Tag[]>(() => read('cosmarium-tags', []))
  const [quickAccess, setQuickAccess] = useState<QuickAccessItem[]>(() => read('cosmarium-quick-access', []))
  const [taggedPaths, setTaggedPaths] = useState<Record<string, string[]>>(() => read('cosmarium-tagged-paths', {}))

  useEffect(() => {
    writeStorage(STORAGE.tags, JSON.stringify(tags))
  }, [tags])
  useEffect(() => {
    writeStorage(STORAGE.quickAccess, JSON.stringify(quickAccess))
  }, [quickAccess])
  useEffect(() => {
    writeStorage(STORAGE.taggedPaths, JSON.stringify(taggedPaths))
  }, [taggedPaths])

  const createTag = (tag: Omit<Tag, 'id'>) => {
    const next: Tag = { ...tag, id: newTagId(tag.name) }
    setTags((current) => [...current, next])
    return next
  }
  const assignTag = (path: string, tagId: string) => setTaggedPaths((current) => ({ ...current, [path]: [...new Set([...(current[path] || []), tagId])] }))
  const unassignTag = (path: string, tagId: string) =>
    setTaggedPaths((current) => {
      const next = (current[path] || []).filter((id) => id !== tagId)
      if (next.length === 0) {
        const { [path]: _removed, ...rest } = current
        return rest
      }
      return { ...current, [path]: next }
    })
  const moveTag = (from: string, to: string) =>
    setTaggedPaths((current) => {
      const moved = current[from]
      if (!moved || moved.length === 0 || from === to) return current
      const { [from]: _dropped, ...rest } = current
      const merged = [...new Set([...(rest[to] || []), ...moved])]
      return { ...rest, [to]: merged }
    })
  const removeTag = (tagId: string) => {
    setTags((current) => current.filter((tag) => tag.id !== tagId))
    setTaggedPaths((current) => {
      const next: Record<string, string[]> = {}
      for (const [path, ids] of Object.entries(current)) {
        const kept = ids.filter((id) => id !== tagId)
        if (kept.length > 0) next[path] = kept
      }
      return next
    })
  }
  const addQuickAccess = (item: QuickAccessItem) =>
    setQuickAccess((current) => (current.some((entry) => entry.path === item.path) ? current : [...current, item]))
  const removeQuickAccess = (path: string) => setQuickAccess((current) => current.filter((entry) => entry.path !== path))

  return (
    <OrganizerContext.Provider
      value={{ tags, quickAccess, taggedPaths, createTag, assignTag, unassignTag, moveTag, removeTag, addQuickAccess, removeQuickAccess }}
    >
      {children}
    </OrganizerContext.Provider>
  )
}

export function useOrganizer() {
  const value = useContext(OrganizerContext)
  if (!value) throw new Error('useOrganizer must be used within OrganizerProvider')
  return value
}
