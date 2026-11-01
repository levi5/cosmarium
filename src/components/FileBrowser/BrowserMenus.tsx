import { copyText, previewType } from '../../lib/format'
import { useExplorerStore } from '../../stores/explorerStore'
import { BackgroundContextMenu } from '../BackgroundContextMenu'
import { FileContextMenu } from '../FileContextMenu'
import type { FileBrowserController } from './useFileBrowser'

export function BrowserMenus({ browser: b }: { browser: FileBrowserController }) {
  const {
    menu,
    backgroundMenu,
    t,
    workspace: { currentPath, refresh },
    clipboard,
    preferences,
    actions,
    inspection,
    transfers
  } = b
  const createTab = useExplorerStore((state) => state.createTab)
  const fileAction = (action: () => void) => () => {
    action()
    b.setMenu(null)
  }
  const backgroundAction = (action: () => void) => () => {
    action()
    b.setBackgroundMenu(null)
  }
  return (
    <>
      {menu && (
        <FileContextMenu
          entry={menu.entry}
          anchorX={menu.anchorX}
          anchorY={menu.anchorY}
          canPreview={Boolean(previewType(menu.entry))}
          canPaste={clipboard.paths.length > 0}
          labels={{
            open: t('open'),
            openInNewTab: t('openInNewTab'),
            preview: t('preview'),
            cut: t('cut'),
            copy: t('copy'),
            paste: t('paste'),
            rename: t('rename'),
            delete_: t('delete_'),
            copyPath: t('copyPath'),
            quickAccess: t('addQuickAccess'),
            tag: t('addTag'),
            properties: t('properties')
          }}
          onOpen={fileAction(() => b.open(menu.entry))}
          onOpenInNewTab={fileAction(() => createTab(menu.entry.path))}
          onPreview={fileAction(() => inspection.setPreview(menu.entry))}
          onCut={fileAction(() => b.copy('cut', menu.entry))}
          onCopy={fileAction(() => b.copy('copy', menu.entry))}
          onPaste={fileAction(() => void transfers.doPaste(menu.entry.path))}
          onRename={fileAction(() => actions.doRename(menu.entry))}
          onDelete={fileAction(() => b.requestDelete(menu.entry))}
          onCopyPath={fileAction(() => void copyText(menu.entry.path))}
          onTag={fileAction(() => inspection.setTagTarget(menu.entry))}
          onQuickAccess={fileAction(() => b.organizer.addQuickAccess({ path: menu.entry.path, name: menu.entry.name }))}
          onProperties={fileAction(() => inspection.setPropertiesTarget(menu.entry))}
          onClose={() => b.setMenu(null)}
        />
      )}
      {backgroundMenu && (
        <BackgroundContextMenu
          anchorX={backgroundMenu.anchorX}
          anchorY={backgroundMenu.anchorY}
          canPaste={clipboard.paths.length > 0}
          showHidden={preferences.showHidden}
          view={b.view}
          detailsPane={b.detailsPane}
          labels={{
            newFolder: t('newFolder'),
            newFile: t('newFile'),
            paste: t('paste'),
            refresh: t('refresh'),
            copyCurrentPath: t('copyCurrentPath'),
            grid: t('gridView'),
            list: t('listView'),
            details: t('details'),
            compact: t('compact'),
            showHidden: t('showHidden'),
            showDetailsPane: t('showDetailsPane'),
            emptyTrash: t('emptyTrash')
          }}
          onNewFolder={backgroundAction(() => actions.setFolderDialog({ open: true, error: null }))}
          onNewFile={backgroundAction(() => actions.setFileDialog({ open: true, error: null }))}
          onPaste={backgroundAction(() => void transfers.doPaste(currentPath))}
          onRefresh={backgroundAction(() => void refresh())}
          onCopyCurrentPath={backgroundAction(() => void copyText(currentPath))}
          onGrid={backgroundAction(() => b.setView('grid'))}
          onList={backgroundAction(() => b.setView('list'))}
          onDetails={backgroundAction(() => b.setView('details'))}
          onCompact={backgroundAction(() => b.setView('compact'))}
          onToggleHidden={backgroundAction(() => preferences.setShowHidden(!preferences.showHidden))}
          onToggleDetailsPane={backgroundAction(() => b.setDetailsPane(!b.detailsPane))}
          {...(b.isTrash && b.workspace.entries.length ? { onEmptyTrash: backgroundAction(() => actions.setEmptyTrashOpen(true)) } : {})}
          onClose={() => b.setBackgroundMenu(null)}
        />
      )}
    </>
  )
}
