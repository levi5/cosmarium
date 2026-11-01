import { createTranslator } from '../../lib/i18n'
import { usePreferences } from '../../lib/preferences'
import { Icon } from '../base/Icon'
import { SectionHeading } from '../base/SectionHeading'
import './styles.css'

export function Shortcuts() {
  const { language } = usePreferences()
  const t = createTranslator(language)

  return (
    <section className="section section--tight shortcuts" id="atalhos">
      <div className="container shortcuts__layout">
        <div className="shortcuts__copy">
          <SectionHeading eyebrow={t.shortcuts.eyebrow} title={t.shortcuts.title} description={t.shortcuts.description} />
          <p className="shortcuts__note" data-reveal>
            <Icon name="keyboard" size={16} />
            {t.shortcuts.note}
          </p>
        </div>
        <div className="shortcuts__grid">
          {t.shortcuts.items.map((item, index) => (
            <div
              key={item.label}
              className="shortcut-card"
              data-reveal
              style={{ transitionDelay: `${Math.min(index * 35, 180)}ms` }}
            >
              <span className="shortcut-card__keys">
                {item.keys.map((key) => (
                  <kbd key={key}>{key}</kbd>
                ))}
              </span>
              <span className="shortcut-card__label">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
