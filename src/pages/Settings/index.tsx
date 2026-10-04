import { Icon } from '../../components/base/Icon'
import { ShortcutSettings } from '../../components/ShortcutSettings'
import { createTranslator } from '../../lib/i18n'
import { type Accent, type IconSize, type Material, type Theme, usePreferences } from '../../lib/preferences'
import './styles.css'

const accents: Accent[] = ['violet', 'blue', 'coral', 'lime']
const materials: Material[] = ['solid', 'mica', 'acrylic']
const iconSizes: IconSize[] = ['small', 'medium', 'large']

export function Settings() {
  const {
    theme,
    accent,
    customAccent,
    language,
    material,
    showSize,
    iconSize,
    showRecent,
    setTheme,
    setAccent,
    setCustomAccent,
    setLanguage,
    setMaterial,
    setShowSize,
    setIconSize,
    setShowRecent
  } = usePreferences()
  const translateText = createTranslator(language)
  return (
    <section className="settings-page">
      <p className="eyebrow">{translateText('settings')}</p>
      <h1>{translateText('settingsTitle')}</h1>
      <p className="settings-intro">{translateText('appearanceDesc')}</p>
      <div className="settings-card">
        <div className="setting-label">
          <span>{translateText('theme')}</span>
          <small>{translateText('appearanceDesc')}</small>
        </div>
        <div className="theme-options">
          {(['dark', 'light'] as Theme[]).map((option) => (
            <button
              type="button"
              key={option}
              onClick={() => setTheme(option)}
              className={theme === option ? 'selected' : ''}
              aria-label={translateText(option)}
              title={translateText(option)}
              aria-pressed={theme === option}
            >
              <Icon name={option === 'dark' ? 'moon' : 'sun'} size={16} />
              {theme === option && (
                <span className="theme-check">
                  <Icon name="check" size={11} />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="settings-card">
        <div className="setting-label">
          <span>{translateText('material')}</span>
          <small>{translateText('materialDesc')}</small>
        </div>
        <div className="material-options">
          {materials.map((option) => (
            <button
              type="button"
              key={option}
              onClick={() => setMaterial(option)}
              className={`material-swatch material-swatch--${option} ${material === option ? 'selected' : ''}`}
              aria-label={translateText(option)}
              aria-pressed={material === option}
            >
              {material === option && <Icon name="check" size={13} />}
            </button>
          ))}
        </div>
      </div>
      <div className="settings-card">
        <div className="setting-label">
          <span>{translateText('accent')}</span>
          <small>{translateText('accentDesc')}</small>
        </div>
        <div className="accent-options">
          {accents.map((option) => (
            <button
              type="button"
              key={option}
              onClick={() => setAccent(option)}
              className={`accent-dot accent-dot--${option} ${accent === option ? 'selected' : ''}`}
              aria-label={option}
              title={option}
            >
              {accent === option && <Icon name="check" size={13} />}
            </button>
          ))}
          <label
            className={`accent-dot accent-dot--custom ${accent === 'custom' ? 'selected' : ''}`}
            title={translateText('customColor')}
            aria-label={translateText('customColor')}
            style={accent === 'custom' ? { background: customAccent } : undefined}
          >
            {accent === 'custom' ? <Icon name="check" size={13} /> : <Icon name="plus" size={13} />}
            <input
              type="color"
              value={customAccent}
              onChange={(event) => {
                setCustomAccent(event.target.value)
                setAccent('custom')
              }}
            />
          </label>
        </div>
      </div>
      <div className="settings-card">
        <div className="setting-label">
          <span>{translateText('iconSize')}</span>
          <small>{translateText('iconSizeDesc')}</small>
        </div>
        <div className="icon-size-options" role="radiogroup" aria-label={translateText('iconSize')}>
          {iconSizes.map((option) => (
            <label key={option} className={`icon-size-option ${iconSize === option ? 'selected' : ''}`}>
              <input
                type="radio"
                name="icon-size"
                value={option}
                checked={iconSize === option}
                onChange={() => setIconSize(option)}
                className="icon-size-option__input"
              />
              <i className={`icon-size-option__box icon-size-option__box--${option}`} aria-hidden="true">
                <i />
              </i>
              {translateText(option === 'small' ? 'iconSmall' : option === 'medium' ? 'iconMedium' : 'iconLarge')}
            </label>
          ))}
        </div>
      </div>
      <div className="settings-card">
        <div className="setting-label">
          <span>{translateText('showSize')}</span>
          <small>{translateText('showSizeDesc')}</small>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={showSize}
          aria-label={translateText('showSize')}
          className={`switch ${showSize ? 'is-on' : ''}`}
          onClick={() => setShowSize(!showSize)}
        >
          <i />
        </button>
      </div>
      <div className="settings-card">
        <div className="setting-label">
          <span>{translateText('showRecent')}</span>
          <small>{translateText('showRecentDesc')}</small>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={showRecent}
          aria-label={translateText('showRecent')}
          className={`switch ${showRecent ? 'is-on' : ''}`}
          onClick={() => setShowRecent(!showRecent)}
        >
          <i />
        </button>
      </div>
      <div className="settings-card">
        <div className="setting-label">
          <span>{translateText('language')}</span>
          <small>{translateText('languageDesc')}</small>
        </div>
        <div className="language-options">
          <button type="button" onClick={() => setLanguage('pt-BR')} className={language === 'pt-BR' ? 'selected' : ''}>
            Português (Brasil)
          </button>
          <button type="button" onClick={() => setLanguage('en')} className={language === 'en' ? 'selected' : ''}>
            English
          </button>
        </div>
      </div>
      <ShortcutSettings language={language} />
    </section>
  )
}
