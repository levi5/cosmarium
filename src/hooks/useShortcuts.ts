import { useEffect, useRef } from 'react'
import { SHORTCUTS, type ShortcutId } from '../constants/shortcuts'
import { comboFromEvent, isEditableTarget } from '../lib/shortcuts'
import { resolveBindings, useShortcutStore } from '../stores/shortcutStore'

export type ShortcutHandlers = Partial<Record<ShortcutId, (event: KeyboardEvent) => void>>

type Options = {
  enabled: boolean
  hasTargets?: boolean
  handlers: ShortcutHandlers
}

export function useShortcuts({ enabled, hasTargets = false, handlers }: Options): void {
  const overrides = useShortcutStore((state) => state.overrides)
  const latest = useRef(handlers)
  latest.current = handlers

  useEffect(() => {
    if (!enabled) return
    const resolved = resolveBindings(overrides)
    const defs = new Map(SHORTCUTS.map((def) => [def.id, def]))
    const byCombo = new Map<string, ShortcutId>()
    for (const def of SHORTCUTS) {
      if (resolved[def.id]) byCombo.set(resolved[def.id], def.id)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const combo = comboFromEvent(event)
      if (!combo) return
      const id = byCombo.get(combo)
      if (!id) return
      const def = defs.get(id)
      if (def?.needsTarget && !hasTargets) return
      if (!def?.allowInInput && isEditableTarget(event.target)) return
      const handler = latest.current[id]
      if (!handler) return
      event.preventDefault()
      handler(event)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled, hasTargets, overrides])
}
