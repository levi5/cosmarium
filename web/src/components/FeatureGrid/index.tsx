import { createTranslator } from '../../lib/i18n'
import { usePreferences } from '../../lib/preferences'
import { Icon, type IconName } from '../base/Icon'
import { SectionHeading } from '../base/SectionHeading'
import './styles.css'

const featureIcons: IconName[] = ['tabs', 'refresh', 'download', 'undo', 'eye', 'archive', 'search', 'tag', 'keyboard']

export function FeatureGrid() {
  const { language } = usePreferences()
  const t = createTranslator(language)

  return (
    <section className="section features" id="recursos">
      <div className="container">
        <SectionHeading eyebrow={t.features.eyebrow} title={t.features.title} description={t.features.description} />
        <div className="features__grid">
          {t.features.items.map((item, index) => (
            <article
              key={item.title}
              className="feature-card"
              data-reveal
              style={{ transitionDelay: `${Math.min(index * 45, 220)}ms` }}
            >
              <span className="feature-card__icon">
                <Icon name={featureIcons[index] ?? 'file'} size={18} />
              </span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
