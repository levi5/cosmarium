import { createTranslator } from '../../lib/i18n'
import { usePreferences } from '../../lib/preferences'
import { Icon, type IconName } from '../base/Icon'
import { SectionHeading } from '../base/SectionHeading'
import './styles.css'

const principleIcons: IconName[] = ['shield', 'code', 'rocket']

export function Stack() {
  const { language } = usePreferences()
  const t = createTranslator(language)

  return (
    <section className="section stack" id="stack">
      <div className="container">
        <div className="stack__layout">
          <div className="stack__copy">
            <SectionHeading eyebrow={t.stack.eyebrow} title={t.stack.title} description={t.stack.description} />
            <div className="stack__tech" data-reveal>
              {t.stack.tech.map((tech) => (
                <div key={tech.name} className="stack__tech-item">
                  <span className="stack__tech-name">{tech.name}</span>
                  <span className="stack__tech-role">{tech.role}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="stack__code-card" data-reveal>
            <div className="stack__code-head">
              <span className="stack__dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span>{t.stack.code.file}</span>
              <Icon name="code" size={13} />
            </div>
            <pre className="stack__code">
              <code>
                <span className="stack__punct">{'{'}</span>
                {t.stack.code.lines.map((line) => (
                  <span key={line.key} className="stack__line">
                    {`  `}
                    <span className="stack__key">"{line.key}"</span>
                    <span className="stack__punct">: </span>
                    <span className="stack__value">"{line.value}"</span>
                    <span className="stack__punct">,</span>
                  </span>
                ))}
                <span className="stack__punct">{'}'}</span>
              </code>
            </pre>
          </div>
        </div>

        <div className="stack__principles">
          {t.stack.principles.map((principle, index) => (
            <article key={principle.title} className="principle" data-reveal style={{ transitionDelay: `${index * 60}ms` }}>
              <span className="principle__icon">
                <Icon name={principleIcons[index] ?? 'info'} size={17} />
              </span>
              <div>
                <h3>{principle.title}</h3>
                <p>{principle.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
