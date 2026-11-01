import logo from '../../assets/logo.png'
import { REPO_URL } from '../../constants/site'
import { createTranslator } from '../../lib/i18n'
import { type Language, usePreferences } from '../../lib/preferences'
import { GitHubMark } from '../base/GitHubMark'
import { Icon } from '../base/Icon'
import './styles.css'

const navItems = [
  { href: '#recursos', key: 'features' },
  { href: '#atalhos', key: 'shortcuts' },
  { href: '#stack', key: 'stack' },
  { href: '#download', key: 'download' }
] as const

export function Header() {
  const { theme, language, toggleTheme, setLanguage } = usePreferences()
  const t = createTranslator(language)

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <a className="brand" href="#top" aria-label="Cosmarium">
          <img className="brand__logo" src={logo} alt="" width="32" height="32" />
          <span className="brand__name">Cosmarium</span>
        </a>

        <nav className="site-nav" aria-label={t.header.navLabel}>
          {navItems.map((item) => (
            <a key={item.href} href={item.href}>
              {t.nav[item.key]}
            </a>
          ))}
        </nav>

        <div className="site-header__actions">
          <div className="lang-switch" role="group" aria-label={t.header.language}>
            {(['pt-BR', 'en'] as Language[]).map((option) => (
              <button
                key={option}
                type="button"
                className={language === option ? 'is-active' : ''}
                aria-pressed={language === option}
                onClick={() => setLanguage(option)}
              >
                {option === 'pt-BR' ? 'PT' : 'EN'}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="icon-button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? t.header.themeToLight : t.header.themeToDark}
            title={theme === 'dark' ? t.header.themeToLight : t.header.themeToDark}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
          </button>

          <a
            className="github-link"
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label={t.header.github}
            title={t.header.github}
          >
            <GitHubMark size={17} />
            <span>GitHub</span>
          </a>
        </div>
      </div>
    </header>
  )
}
