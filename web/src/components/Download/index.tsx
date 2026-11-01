import { useEffect, useRef, useState } from 'react'
import { CLONE_COMMAND, README_URL, RELEASES_URL } from '../../constants/site'
import { copyText } from '../../lib/clipboard'
import { createTranslator } from '../../lib/i18n'
import { usePreferences } from '../../lib/preferences'
import { Button, ButtonLink } from '../base/Button'
import { Icon, type IconName } from '../base/Icon'
import './styles.css'

const platformIcons: IconName[] = ['desktop', 'drive', 'code']

export function Download() {
  const { language } = usePreferences()
  const t = createTranslator(language)
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current)
    },
    []
  )

  const handleCopy = async () => {
    const ok = await copyText(CLONE_COMMAND)
    if (!ok) return
    setCopied(true)
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <section className="section download" id="download">
      <div className="container">
        <div className="download__panel" data-reveal>
          <div className="download__glow" aria-hidden="true" />
          <div className="download__content">
            <p className="eyebrow">{t.download.eyebrow}</p>
            <h2>{t.download.title}</h2>
            <p className="download__description">{t.download.description}</p>
            <div className="download__actions">
              <ButtonLink variant="primary" href={RELEASES_URL} target="_blank" rel="noreferrer">
                <Icon name="download" size={17} />
                {t.download.primary}
              </ButtonLink>
              <ButtonLink variant="secondary" href={README_URL} target="_blank" rel="noreferrer">
                {t.download.secondary}
              </ButtonLink>
            </div>
            <p className="download__requirement">{t.download.requirement}</p>
          </div>

          <div className="download__side">
            <ul className="download__platforms">
              {t.download.platforms.map((platform, index) => (
                <li key={platform.name}>
                  <span className="download__platform-icon">
                    <Icon name={platformIcons[index] ?? 'desktop'} size={16} />
                  </span>
                  <span>
                    <strong>{platform.name}</strong>
                    <small>{platform.detail}</small>
                  </span>
                </li>
              ))}
            </ul>

            <div className="download__clone">
              <span className="download__clone-label">{t.download.cloneLabel}</span>
              <div className="download__command">
                <code>{CLONE_COMMAND}</code>
                <Button
                  variant="ghost"
                  className={`download__copy${copied ? ' is-copied' : ''}`}
                  onClick={handleCopy}
                  aria-label={copied ? t.download.copied : t.download.copy}
                  title={copied ? t.download.copied : t.download.copy}
                >
                  <Icon name={copied ? 'check' : 'copy'} size={14} />
                  <span>{copied ? t.download.copied : t.download.copy}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
