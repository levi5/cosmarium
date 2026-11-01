import { REPO_URL } from '../../constants/site'
import { createTranslator } from '../../lib/i18n'
import { usePreferences } from '../../lib/preferences'
import { AppWindow } from '../AppWindow'
import { ButtonLink } from '../base/Button'
import { Icon } from '../base/Icon'
import { GitHubMark } from '../base/GitHubMark'
import './styles.css'

export function Hero() {
  const { language } = usePreferences()
  const t = createTranslator(language)

  return (
    <section className="hero" id="top">
      <div className="hero__grid" aria-hidden="true" />
      <div className="container hero__inner">
        <div className="hero__copy">
          <span className="hero__badge" data-reveal>
            <span className="hero__dot" />
            {t.hero.badge}
          </span>
          <h1 data-reveal style={{ transitionDelay: '60ms' }}>
            {t.hero.title}
            <span className="hero__accent">{t.hero.titleAccent}</span>
          </h1>
          <p className="hero__description" data-reveal style={{ transitionDelay: '120ms' }}>
            {t.hero.description}
          </p>
          <div className="hero__actions" data-reveal style={{ transitionDelay: '180ms' }}>
            <ButtonLink variant="primary" href="#download">
              <Icon name="download" size={17} />
              {t.hero.primary}
            </ButtonLink>
            <ButtonLink variant="secondary" href={REPO_URL} target="_blank" rel="noreferrer">
              <GitHubMark size={17} />
              {t.hero.secondary}
            </ButtonLink>
          </div>
          <ul className="hero__meta" data-reveal style={{ transitionDelay: '240ms' }}>
            {t.hero.meta.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="hero__visual" role="img" aria-label={t.hero.previewAlt} data-reveal>
          <div className="hero__halo" aria-hidden="true" />
          <AppWindow />
          <div className="hero__transfer">
            <div className="hero__transfer-head">
              <span className="hero__transfer-title">
                <span className="hero__pulse" />
                {t.preview.transferTitle}
              </span>
              <span className="hero__transfer-percent">68%</span>
            </div>
            <div className="hero__progress" aria-hidden="true">
              <span />
            </div>
            <div className="hero__transfer-meta">
              <span>{t.preview.transferMeta}</span>
              <span>{t.preview.transferEta}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
