import { useEffect, useState } from 'react'
import { getShortcut, SHORTCUT_GROUP_LABELS, type ShortcutId, shortcutsByGroup } from '../../constants/shortcuts'
import { createTranslator } from '../../lib/i18n'
import type { Language } from '../../lib/preferences'
import { comboFromEvent, formatCombo } from '../../lib/shortcuts'
import { bindingOf, useShortcutStore } from '../../stores/shortcutStore'
import { Button } from '../base/Button'
import './styles.css'

type Props = {
  language: Language
}

export function ShortcutSettings({ language }: Props) {
  const overrides = useShortcutStore((state) => state.overrides)
  const setBinding = useShortcutStore((state) => state.setBinding)
  const clearBinding = useShortcutStore((state) => state.clearBinding)
  const resetAll = useShortcutStore((state) => state.resetAll)
  const translateText = createTranslator(language)
  const [capture, setCapture] = useState<{ id: ShortcutId; combo: string } | null>(null)
  const [notice, setNotice] = useState<{ id: ShortcutId; conflict: ShortcutId } | null>(null)

  useEffect(() => {
    if (!capture) return
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (event.key === 'Escape') {
        setCapture(null)
        return
      }
      const bareBackspace = (event.key === 'Backspace' || event.key === 'Delete') && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey
      if (bareBackspace) {
        clearBinding(capture.id)
        setCapture(null)
        return
      }
      const combo = comboFromEvent(event)
      if (!combo) return
      const clash = useShortcutStore.getState().conflictFor(capture.id, combo)
      setBinding(capture.id, combo)
      setCapture(null)
      setNotice(clash ? { id: capture.id, conflict: clash } : null)
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [capture, clearBinding, setBinding])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 5000)
    return () => window.clearTimeout(timer)
  }, [notice])

  const hasOverrides = Object.keys(overrides).length > 0

  return (
    <div className="shortcut-settings">
      <div className="settings-card">
        <div className="setting-label">
          <span>{translateText('keyboardShortcuts')}</span>
          <small>{translateText('keyboardShortcutsDesc')}</small>
        </div>
        <Button variant="ghost" disabled={!hasOverrides} onClick={resetAll}>
          {translateText('shortcutResetAll')}
        </Button>
      </div>

      {shortcutsByGroup().map(({ group, items }) => (
        <section className="shortcut-group" key={group}>
          <h3 className="shortcut-group__title">{translateText(SHORTCUT_GROUP_LABELS[group])}</h3>
          <ul className="shortcut-list">
            {items.map((def) => {
              const combo = bindingOf(def.id, overrides)
              const recording = capture?.id === def.id
              const conflict = notice?.id === def.id ? notice.conflict : null
              const shown = recording
                ? capture.combo
                  ? formatCombo(capture.combo)
                  : translateText('shortcutPressKeys')
                : combo
                  ? formatCombo(combo)
                  : translateText('shortcutUnassigned')
              return (
                <li className="shortcut-row" key={def.id}>
                  <span className="shortcut-row__label">{translateText(def.label)}</span>
                  <div className="shortcut-row__controls">
                    {conflict && (
                      <small className="shortcut-row__conflict">
                        {translateText('shortcutConflict').replace('{command}', translateText(getShortcut(conflict).label))}
                      </small>
                    )}
                    <button
                      type="button"
                      className={`shortcut-key${recording ? ' is-recording' : ''}${combo ? '' : ' is-empty'}`}
                      onClick={() => setCapture({ id: def.id, combo: '' })}
                      onBlur={() => setCapture(null)}
                      title={translateText('keyboardShortcutsDesc')}
                    >
                      {shown}
                    </button>
                    <button
                      type="button"
                      className="shortcut-reset"
                      hidden={!overrides[def.id]}
                      aria-label={translateText('shortcutResetOne')}
                      title={translateText('shortcutResetOne')}
                      onClick={() => clearBinding(def.id)}
                    >
                      ↺
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
