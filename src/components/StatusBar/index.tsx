import { useFileWorkspace } from '../../lib/files'
import { createTranslator } from '../../lib/i18n'
import { usePreferences } from '../../lib/preferences'
import { useSelectionStore } from '../../stores/selectionStore'
import { useTransferStore } from '../../stores/transferStore'
import { Icon } from '../base/Icon'
import './styles.css'

export function StatusBar() {
  const { entries } = useFileWorkspace()
  const { selected } = useSelectionStore()
  const { language } = usePreferences()
  const t = createTranslator(language)
  const { items, panelOpen, setPanelOpen } = useTransferStore()
  const count = Object.keys(items).length
  const active = Object.values(items).some((item) => !item.finished)
  const failed = Object.values(items).some((item) => item.error)
  return (
    <footer className="status-bar">
      <span>
        {entries.length} {t('items')}
      </span>
      {selected.length > 0 && (
        <>
          <span className="status-bar__divider" />
          <span>{t(selected.length === 1 ? 'statusSelectedOne' : 'statusSelectedMany').replace('{count}', String(selected.length))}</span>
        </>
      )}
      {count > 0 && (
        <button
          type="button"
          className={`status-bar__notifications${failed ? ' has-error' : active ? ' is-active' : ''}`}
          aria-expanded={panelOpen}
          aria-controls="transfer-notifications"
          onClick={() => setPanelOpen(!panelOpen)}
        >
          <Icon name={failed ? 'info' : active ? 'refresh' : 'info'} size={13} />
          {count} {language === 'pt-BR' ? 'notificações' : 'notifications'}
        </button>
      )}
    </footer>
  )
}
