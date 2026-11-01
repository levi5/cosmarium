import { ConflictDialog } from '../ConflictDialog'
import { EntryDialogs } from '../EntryDialogs'
import { InspectionDialogs } from '../EntryDialogs/InspectionDialogs'
import type { FileBrowserController } from './useFileBrowser'

export function BrowserDialogs({ browser: b }: { browser: FileBrowserController }) {
  const { t, transfers: x } = b
  return (
    <>
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
