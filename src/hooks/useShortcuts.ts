import { useEffect, useRef } from 'react'
import { SHORTCUTS, type ShortcutId } from '../constants/shortcuts'
import { comboFromEvent, isEditableTarget } from '../lib/shortcuts'
import { resolveBindings, type ShortcutOverrides, useShortcutStore } from '../stores/shortcutStore'

export type ShortcutHandlers = Partial<Record<ShortcutId, (event: KeyboardEvent) => void>>

type Options = {
  enabled: boolean
  hasTargets?: boolean
  handlers: ShortcutHandlers
}

export function dispatchShortcut(event: KeyboardEvent, { enabled, hasTargets = false, handlers }: Options, overrides: ShortcutOverrides): boolean {
  if (!enabled || document.querySelector('[role="dialog"]')) return false
  const combo = comboFromEvent(event)
  if (!combo) return false
  const resolved = resolveBindings(overrides)
  const definition = [...SHORTCUTS].reverse().find((item) => resolved[item.id] === combo)
  if (!definition || (definition.needsTarget && !hasTargets) || (!definition.allowInInput && isEditableTarget(event.target))) return false
  const handler = handlers[definition.id]
  if (!handler) return false
  event.preventDefault()
  handler(event)
  return true
}

export function useShortcuts({ enabled, hasTargets = false, handlers }: Options): void {
  const overrides = useShortcutStore((state) => state.overrides)
  const latest = useRef(handlers)
  latest.current = handlers

  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      dispatchShortcut(event, { enabled, hasTargets, handlers: latest.current }, overrides)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled, hasTargets, overrides])
}
