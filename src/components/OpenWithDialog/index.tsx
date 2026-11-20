import { useEffect, useState } from 'react'
import { errorMessage } from '../../lib/format'
import { createTranslator } from '../../lib/i18n'
import type { Language } from '../../lib/preferences'
import { type FileApplication, filesystem } from '../../services/tauri/filesystem'
import type { FileEntry } from '../../types/explorer'
import { Button } from '../base/Button'
import { Dialog } from '../base/Dialog'
import { Icon } from '../base/Icon'
import './styles.css'

export function OpenWithDialog({ entry, language, onClose }: { entry: FileEntry; language: Language; onClose: () => void }) {
  const t = createTranslator(language)
  const [apps, setApps] = useState<FileApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const visibleApps = apps.filter((app) => app.name.toLocaleLowerCase(language).includes(query.trim().toLocaleLowerCase(language)))
  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    filesystem.listApplications(entry.path).then(
      (items) => {
        if (alive) {
          setApps(items)
          setLoading(false)
        }
      },
      (reason) => {
        if (alive) {
          setError(errorMessage(reason))
          setLoading(false)
        }
      }
    )
    return () => {
      alive = false
    }
  }, [entry.path])
  const open = async (app: FileApplication) => {
    if (opening) return
    setOpening(true)
    setError(null)
    try {
      await filesystem.openWithApplication(entry.path, app.id)
      onClose()
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setOpening(false)
    }
  }
  return (
    <Dialog backdropClass="open-with-backdrop" dismissLabel={t('cancel')} onClose={onClose}>
      <section className="notification-surface open-with-dialog" aria-label={t('openWith')}>
        <header className="open-with-dialog__header">
          <span className="open-with-dialog__heading-icon">
            <Icon name="grid" size={20} />
          </span>
          <div>
            <h2>{t('openWith')}</h2>
            <p>{t('chooseApplication')}</p>
          </div>
          <button type="button" className="open-with-dialog__close" aria-label={t('close')} onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="open-with-dialog__file">
          <span className="open-with-dialog__file-icon">
            <Icon name="file" size={24} />
          </span>
          <div>
            <strong className="open-with-dialog__filename">{entry.name}</strong>
            <span className="open-with-dialog__path" title={entry.path}>
              {entry.path}
            </span>
          </div>
        </div>
        {!loading && apps.length > 0 && (
          <label className="open-with-dialog__search">
            <Icon name="search" size={16} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('searchApplications')}
              aria-label={t('searchApplications')}
              disabled={opening}
            />
          </label>
        )}
        <div className="open-with-dialog__list-heading">
          <span>{t('compatibleApplications')}</span>
          {!loading && <span>{visibleApps.length}</span>}
        </div>
        {loading && (
          <div className="open-with-dialog__state" role="status">
            <Icon name="clock" size={22} />
            <p>{t('loading')}</p>
          </div>
        )}
        {error && (
          <div className="open-with-dialog__error" role="alert">
            <Icon name="info" size={16} />
            <span>{error}</span>
          </div>
        )}
        {!loading && !error && !apps.length && (
          <div className="open-with-dialog__state">
            <Icon name="grid" size={24} />
            <p>{t('noApplications')}</p>
          </div>
        )}
        {!loading && apps.length > 0 && !visibleApps.length && (
          <div className="open-with-dialog__state" role="status">
            <Icon name="search" size={24} />
            <p>{t('noMatchingApplications')}</p>
          </div>
        )}
        <div className="open-with-dialog__apps" aria-busy={loading || opening}>
          {!loading &&
            visibleApps.map((app) => (
              <button
                type="button"
                key={app.id}
                className={app.isDefault ? 'is-default' : undefined}
                aria-label={app.isDefault ? `${app.name} ${t('defaultApplication')}` : app.name}
                disabled={opening}
                onClick={() => void open(app)}
              >
                <span className="open-with-dialog__app-icon">
                  <Icon name={app.isDefault ? 'star' : 'grid'} size={20} />
                </span>
                <span className="open-with-dialog__app-name">{app.name}</span>
                {app.isDefault && <small className="open-with-dialog__badge">{t('defaultApplication')}</small>}
                <span className="open-with-dialog__app-arrow">
                  <Icon name="arrow" size={16} />
                </span>
              </button>
            ))}
        </div>
        <footer className="open-with-dialog__actions">
          <span className="open-with-dialog__hint" role={opening ? 'status' : undefined}>
            <Icon name={opening ? 'clock' : 'info'} size={14} />
            {t(opening ? 'openingApplication' : 'openWithHint')}
          </span>
          <Button variant="ghost" onClick={onClose}>
            {t('cancel')}
          </Button>
        </footer>
      </section>
    </Dialog>
  )
}
