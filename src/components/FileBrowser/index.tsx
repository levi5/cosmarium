import { TrashView } from '../TrashView'
import { BrowserBody } from './BrowserBody'
import { BrowserDialogs } from './BrowserDialogs'
import { BrowserMenus } from './BrowserMenus'
import { BrowserToolbar } from './BrowserToolbar'
import { useFileBrowser } from './useFileBrowser'
import '../FileIcon/styles.css'
import './styles.css'

export function FileBrowser({ compact = false }: { compact?: boolean }) {
  const browser = useFileBrowser(compact)
  const { t } = browser
  if (browser.isTrash && !compact)
    return (
      <section className="file-browser">
        <TrashView
          onChanged={() => void browser.workspace.refresh()}
          labels={{
            name: t('name'),
            origin: t('trashOrigin'),
            deletedAt: t('trashDeletedAt'),
            restore: t('restore'),
            restoreTitle: t('restoreTitle'),
            restoreMessage: t('restoreMessage'),
            emptyTrash: t('emptyTrash'),
            emptyTrashTitle: t('emptyTrashTitle'),
            emptyTrashMessage: t('emptyTrashMessage'),
            trashEmpty: t('trashEmpty'),
            ok: t('ok'),
            cancel: t('cancel'),
            loading: t('loading')
          }}
        />
      </section>
    )
  return (
    <section className={`file-browser ${compact ? 'file-browser--compact' : ''}`} data-native-drop-path={browser.workspace.currentPath}>
      {browser.workspace.watchError && (
        <p role="status">
          {browser.workspace.watchError} — {t('refresh')}
        </p>
      )}
      <BrowserToolbar browser={browser} compact={compact} />
      <BrowserBody browser={browser} compact={compact} />
      <BrowserMenus browser={browser} />
      <BrowserDialogs browser={browser} />
    </section>
  )
}
