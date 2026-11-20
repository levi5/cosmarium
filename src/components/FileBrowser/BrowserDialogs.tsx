import { ConflictDialog } from '../ConflictDialog'
import { EntryDialogs } from '../EntryDialogs'
import { InspectionDialogs } from '../EntryDialogs/InspectionDialogs'
import { Productivity } from '../Productivity'
import { TransferRehearsal } from '../Productivity/TransferRehearsal'
import type { FileBrowserController } from './useFileBrowser'

export function BrowserDialogs({ browser: b }: { browser: FileBrowserController }) {
  const { t, transfers: x } = b
  return (
    <>
      {b.productivityOpen && (
        <Productivity
          language={b.preferences.language}
          root={b.workspace.currentPath}
          query={b.query}
          snapshot={b.snapshotWorkspace}
          onWorkspace={b.restoreWorkspace}
          onFolder={(folder) => {
            b.workspace.navigateTo(folder.root)
            b.setQuery(folder.query)
            b.search.refresh()
            b.setSelected([])
            b.setActiveEntry(null)
          }}
          onClose={() => b.setProductivityOpen(false)}
        />
      )}
      {x.rehearsalState && (
        <TransferRehearsal plan={x.rehearsalState} language={b.preferences.language} onConfirm={x.confirmRehearsal} onClose={() => x.setRehearsalState(null)} />
      )}
      <EntryDialogs actions={b.actions} language={b.preferences.language} />
      <InspectionDialogs inspection={b.inspection} language={b.preferences.language} />
      {x.conflictState && (
        <ConflictDialog
          conflicts={x.conflictState.scan.conflicts}
          fileCount={x.conflictState.scan.files}
          labels={{
            title: t('conflictTitle'),
            message: t('conflictMessage'),
            replace: t('replace'),
            skip: t('skip'),
            keepBoth: t('keepBoth'),
            applyToAll: t('applyToAll'),
            cancel: t('cancel'),
            cont: t('cont')
          }}
          onConfirm={(resolutions) => {
            const state = x.conflictState
            if (!state) return
            x.setConflictState(null)
            void x.runTransfer(state.sources, state.dest, state.cut, resolutions)
          }}
          onClose={() => x.setConflictState(null)}
        />
      )}
    </>
  )
}
