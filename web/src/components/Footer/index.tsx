import logo from '../../assets/logo.png'
import { ISSUES_URL, LICENSE_URL, PROFILE_URL, README_URL, RELEASES_URL, REPO_URL } from '../../constants/site'
import { createTranslator } from '../../lib/i18n'
import { usePreferences } from '../../lib/preferences'
import { Icon } from '../base/Icon'
import './styles.css'

export function Footer() {
  const { language } = usePreferences()
  const t = createTranslator(language)

  return (
    <footer className="site-footer">
      <div className="container site-footer__top">
        <div className="site-footer__brand">
          <a className="brand" href="#top">
            <img className="brand__logo" src={logo} alt="" width="32" height="32" />
            <span className="brand__name">Cosmarium</span>
          </a>
          <p>{t.footer.tagline}</p>
          <a className="site-footer__made" href={PROFILE_URL} target="_blank" rel="noreferrer">
            {t.footer.madeBy}
            <Icon name="arrow" size={12} />
          </a>
        </div>

        <nav className="site-footer__columns" aria-label={t.header.navLabel}>
          <div>
            <h2>{t.footer.product}</h2>
            <a href="#recursos">{t.nav.features}</a>
            <a href="#atalhos">{t.nav.shortcuts}</a>
            <a href="#stack">{t.nav.stack}</a>
            <a href="#download">{t.nav.download}</a>
          </div>
          <div>
            <h2>{t.footer.resources}</h2>
            <a href={RELEASES_URL} target="_blank" rel="noreferrer">
              {t.footer.releases}
            </a>
            <a href={README_URL} target="_blank" rel="noreferrer">
              {t.footer.readme}
            </a>
            <a href={ISSUES_URL} target="_blank" rel="noreferrer">
              {t.footer.issues}
            </a>
          </div>
          <div>
            <h2>{t.footer.project}</h2>
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              {t.footer.source}
            </a>
            <a href={LICENSE_URL} target="_blank" rel="noreferrer">
              {t.footer.license}
            </a>
          </div>
        </nav>
      </div>

      <div className="container site-footer__bottom">
        <span>{t.footer.copyright}</span>
        <a href="#top" className="site-footer__top-link">
          {t.footer.backToTop}
          <Icon name="up" size={13} />
        </a>
      </div>
    </footer>
  )
}
