import { SHORTCUT_GROUP_LABELS, shortcutsByGroup } from '../../constants/shortcuts'
import { createTranslator } from '../../lib/i18n'
import type { Language } from '../../lib/preferences'
import { formatCombo } from '../../lib/shortcuts'
import { bindingOf, useShortcutStore } from '../../stores/shortcutStore'
import { Dialog } from '../base/Dialog'
import './styles.css'

type Props = {
  language: Language
  onClose: () => void
}

export function ShortcutsDialog({ language, onClose }: Props) {
  const overrides = useShortcutStore((state) => state.overrides)
  const translateText = createTranslator(language)

  return (
    <Dialog backdropClass="shortcuts-backdrop" dismissLabel={translateText('close')} onClose={onClose}>
      <section className="shortcuts-dialog" role="dialog" aria-modal="true" aria-label={translateText('shortcutHelpTitle')}>
        <header className="shortcuts-dialog__header">
          <strong>{translateText('shortcutHelpTitle')}</strong>
          <p>{translateText('shortcutHelpDesc')}</p>
        </header>
        <div className="shortcuts-dialog__groups">
          {shortcutsByGroup().map(({ group, items }) => (
            <section className="shortcuts-dialog__group" key={group}>
              <h3>{translateText(SHORTCUT_GROUP_LABELS[group])}</h3>
              <dl>
                {items.map((def) => {
                  const combo = bindingOf(def.id, overrides)
                  return (
                    <div className="shortcuts-dialog__row" key={def.id}>
                      <dt>{translateText(def.label)}</dt>
                      <dd>{combo ? formatCombo(combo) : translateText('shortcutUnassigned')}</dd>
                    </div>
                  )
                })}
              </dl>
            </section>
          ))}
        </div>
      </section>
    </Dialog>
  )
}
