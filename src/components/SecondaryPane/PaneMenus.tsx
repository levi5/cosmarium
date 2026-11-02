import type { ViewMode } from '../../constants/view'
import { copyText, previewType } from '../../lib/format'
import { createTranslator } from '../../lib/i18n'
import { useOrganizer } from '../../lib/organizer'
import type { Language } from '../../lib/preferences'
import { useExplorerStore } from '../../stores/explorerStore'
import type { FileEntry } from '../../types/explorer'
import { BackgroundContextMenu } from '../BackgroundContextMenu'
import type { EntryActions } from '../EntryDialogs/useEntryActions'
import type { Inspection } from '../EntryDialogs/useInspection'
import { FileContextMenu } from '../FileContextMenu'

type Anchor = { anchorX: number; anchorY: number }
type Props = {
  menu: (Anchor & { entry: FileEntry }) | null
  backgroundMenu: Anchor | null
  onClose: () => void
  path: string
  language: Language
  view: ViewMode
  setView: (view: ViewMode) => void
  detailsPane: boolean
  onToggleDetailsPane: () => void
  showHidden: boolean
  onToggleHidden: () => void
  actions: EntryActions
  inspection: Inspection
  onOpen: (entry: FileEntry) => void
  onCopy: (mode: 'copy' | 'cut', entry: FileEntry) => void
  onDelete: (entry: FileEntry) => void
  onPaste: (dest: string) => void
  canPaste: boolean
  onRefresh: () => void
  onError: (reason: unknown) => void
}

export function PaneMenus(p: Props) {
  const t = createTranslator(p.language)
  const { addQuickAccess } = useOrganizer()
  const createTab = useExplorerStore((state) => state.createTab)
  const run = (action: () => void) => () => {
    p.onClose()
    action()
  }
  return (
    <>
      {p.menu && (
        <FileContextMenu
          {...p.menu}
          canPreview={Boolean(previewType(p.menu.entry))}
          canPaste={p.canPaste}
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
          onOpen={run(() => p.menu && p.onOpen(p.menu.entry))}
          onOpenInNewTab={run(() => p.menu && createTab(p.menu.entry.path))}
          onPreview={run(() => p.menu && p.inspection.setPreview(p.menu.entry))}
          onCut={run(() => p.menu && p.onCopy('cut', p.menu.entry))}
          onCopy={run(() => p.menu && p.onCopy('copy', p.menu.entry))}
          onPaste={run(() => p.menu && p.onPaste(p.menu.entry.path))}
          onRename={run(() => p.menu && p.actions.doRename(p.menu.entry))}
          onDelete={run(() => p.menu && p.onDelete(p.menu.entry))}
          onCopyPath={run(() => {
            if (p.menu) void copyText(p.menu.entry.path).catch(p.onError)
          })}
          onQuickAccess={run(() => p.menu && addQuickAccess({ path: p.menu.entry.path, name: p.menu.entry.name }))}
          onTag={run(() => p.menu && p.inspection.setTagTarget(p.menu.entry))}
          onProperties={run(() => p.menu && p.inspection.setPropertiesTarget(p.menu.entry))}
          onClose={p.onClose}
        />
      )}
      {p.backgroundMenu && (
        <BackgroundContextMenu
          {...p.backgroundMenu}
          canPaste={p.canPaste}
          showHidden={p.showHidden}
          view={p.view}
          detailsPane={p.detailsPane}
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
            showDetailsPane: t('showDetailsPane')
          }}
          onNewFolder={run(() => p.actions.setFolderDialog({ open: true, error: null }))}
          onNewFile={run(() => p.actions.setFileDialog({ open: true, error: null }))}
          onPaste={run(() => p.onPaste(p.path))}
          onRefresh={run(p.onRefresh)}
          onCopyCurrentPath={run(() => {
            void copyText(p.path).catch(p.onError)
          })}
          onGrid={run(() => p.setView('grid'))}
          onList={run(() => p.setView('list'))}
          onDetails={run(() => p.setView('details'))}
          onCompact={run(() => p.setView('compact'))}
          onToggleHidden={run(p.onToggleHidden)}
          onToggleDetailsPane={run(p.onToggleDetailsPane)}
          onClose={p.onClose}
        />
      )}
    </>
  )
}
