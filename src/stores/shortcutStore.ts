import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getShortcut, SHORTCUTS, type ShortcutId } from '../constants/shortcuts'
import { normalizeCombo } from '../lib/shortcuts'

export type ShortcutOverrides = Partial<Record<ShortcutId, string>>

type ShortcutState = {
  overrides: ShortcutOverrides
  setBinding: (id: ShortcutId, combo: string) => void
  clearBinding: (id: ShortcutId) => void
  resetAll: () => void
  conflictFor: (id: ShortcutId, combo: string) => ShortcutId | null
}

export function resolveBindings(overrides: ShortcutOverrides): Record<ShortcutId, string> {
  const resolved = {} as Record<ShortcutId, string>
  for (const def of SHORTCUTS) {
    const override = overrides[def.id]
    resolved[def.id] = override ? normalizeCombo(override) : def.defaultCombo
  }
  return resolved
}

export const useShortcutStore = create<ShortcutState>()(
  persist(
    (set, get) => ({
      overrides: {},
      setBinding: (id, combo) =>
        set((state) => {
          const resolved = resolveBindings(state.overrides)
          const next = { ...state.overrides, [id]: combo }
          const clash = SHORTCUTS.find((def) => def.id !== id && resolved[def.id] === combo)
          if (clash) delete next[clash.id]
          return { overrides: next }
        }),
      clearBinding: (id) =>
        set((state) => {
          const next = { ...state.overrides }
          delete next[id]
          return { overrides: next }
        }),
      resetAll: () => set({ overrides: {} }),
      conflictFor: (id, combo) => {
        const resolved = resolveBindings(get().overrides)
        return SHORTCUTS.find((def) => def.id !== id && resolved[def.id] === combo)?.id ?? null
      }
    }),
    { name: 'cosmarium-shortcuts', partialize: (state) => ({ overrides: state.overrides }) }
  )
)

export function bindingOf(id: ShortcutId, overrides: ShortcutOverrides): string {
  const override = overrides[id]
  return override ? normalizeCombo(override) : getShortcut(id).defaultCombo
}
