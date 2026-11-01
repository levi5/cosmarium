import type { SiteContent } from '../../lib/i18n'
import { usePreferences } from '../../lib/preferences'
import { createTranslator } from '../../lib/i18n'
import { Icon, type IconName } from '../base/Icon'
import { FileIcon } from '../FileIcon'
import './styles.css'

const quickIcons: Record<keyof SiteContent['preview']['quick'], IconName> = {
  home: 'home',
  documents: 'file',
  downloads: 'download',
  pictures: 'image',
  music: 'music',
  videos: 'video',
  trash: 'trash'
}

const tagColors = ['#9b7cff', '#e2574c']

export function AppWindow() {
  const { language } = usePreferences()
  const t = createTranslator(language)
  const pathSegments = t.preview.path.split('\\').filter(Boolean)

  return (
    <div className="app-window" aria-hidden="true">
      <div className="app-window__chrome">
        <div className="app-window__tabs">
          {t.preview.tabs.map((tab, index) => (
            <span key={tab} className={`app-window__tab${index === t.preview.tabs.length - 1 ? ' is-active' : ''}`}>
              <FileIcon name={tab} kind="directory" size={12} />
              <span>{tab}</span>
              {index === t.preview.tabs.length - 1 && <Icon name="close" size={9} />}
            </span>
          ))}
          <span className="app-window__tab-add">
            <Icon name="plus" size={10} />
          </span>
        </div>
        <div className="app-window__controls">
          <span>
            <Icon name="minimize" size={10} />
          </span>
          <span>
            <Icon name="maximize" size={9} />
          </span>
          <span className="app-window__close">
            <Icon name="close" size={10} />
          </span>
        </div>
      </div>

      <div className="app-window__nav">
        <div className="app-window__nav-actions">
          <span>
            <Icon name="back" size={12} />
          </span>
          <span>
            <Icon name="arrow" size={12} />
          </span>
          <span>
            <Icon name="up" size={12} />
          </span>
          <span>
            <Icon name="refresh" size={12} />
          </span>
        </div>
        <div className="app-window__breadcrumb">
          <Icon name="home" size={11} />
          {pathSegments.map((segment, index) => (
            <span key={segment} className={index === pathSegments.length - 1 ? 'is-current' : ''}>
              {index > 0 && <Icon name="chevron" size={8} />}
              {segment}
            </span>
          ))}
        </div>
        <span className="app-window__settings">
          <Icon name="settings" size={12} />
        </span>
      </div>

      <div className="app-window__body">
        <aside className="app-window__sidebar">
          <div className="app-window__group">
            <span className="app-window__group-label">{t.preview.quickGroup}</span>
            {Object.entries(t.preview.quick).map(([key, label], index) => (
              <span key={key} className={`app-window__nav-item${index === 0 ? ' is-active' : ''}`}>
                <Icon name={quickIcons[key as keyof typeof quickIcons]} size={12} />
                {label}
              </span>
            ))}
          </div>
          <div className="app-window__group">
            <span className="app-window__group-label">{t.preview.favoriteGroup}</span>
            <span className="app-window__nav-item">
              <Icon name="star" size={12} />
              {t.preview.favorites.cosmarium}
            </span>
            <span className="app-window__nav-item">
              <Icon name="pin" size={12} />
              {t.preview.favorites.brand}
            </span>
          </div>
        </aside>

        <div className="app-window__files">
          <div className="app-window__files-head">
            <span>{t.preview.title}</span>
            <div className="app-window__toolbar">
              <span>
                <Icon name="plus" size={11} />
              </span>
              <span>
                <Icon name="search" size={11} />
              </span>
              <span>
                <Icon name="grid" size={11} />
              </span>
              <span>
                <Icon name="more" size={11} />
              </span>
            </div>
          </div>

          <div className="app-window__table">
            <div className="app-window__thead">
              <span>{t.preview.table.name}</span>
              <span>{t.preview.table.modified}</span>
              <span>{t.preview.table.size}</span>
            </div>
            {t.preview.rows.map((row) => (
              <div key={row.name} className={`app-window__row${row.selected ? ' is-selected' : ''}`}>
                <span className="app-window__name">
                  <FileIcon name={row.name} kind={row.kind} size={13} />
                  <span>{row.name}</span>
                </span>
                <span className="app-window__date">{row.modified}</span>
                <span className="app-window__size">{row.size}</span>
              </div>
            ))}
          </div>
        </div>

        <aside className="app-window__details">
          <span className="app-window__details-title">{t.preview.detailsTitle}</span>
          <div className="app-window__thumb">
            <FileIcon name={t.preview.detailsName} kind="file" size={30} />
            <span>{t.preview.detailsName}</span>
          </div>
          <div className="app-window__detail">
            <span className="app-window__detail-label">{t.preview.tagsLabel}</span>
            <span className="app-window__tags">
              {t.preview.tags.map((tag, index) => (
                <span key={tag} className="app-window__tag">
                  <i style={{ background: tagColors[index] ?? tagColors[0] }} />
                  {tag}
                </span>
              ))}
            </span>
          </div>
          <div className="app-window__detail">
            <span className="app-window__detail-label">{t.preview.sizeLabel}</span>
            <span>{t.preview.sizeValue}</span>
          </div>
          <div className="app-window__detail">
            <span className="app-window__detail-label">{t.preview.modifiedLabel}</span>
            <span>{t.preview.modifiedValue}</span>
          </div>
        </aside>
      </div>

      <div className="app-window__status">
        <span>{t.preview.status}</span>
        <i />
        <span>{t.preview.statusSelected}</span>
      </div>
    </div>
  )
}
