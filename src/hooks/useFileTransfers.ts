import { useCallback, useEffect, useState } from 'react'
import { useFileWorkspace } from '../lib/files'
import { errorMessage } from '../lib/format'
import { newOperationId } from '../lib/id'
import { useOrganizer } from '../lib/organizer'
import { filesystem } from '../services/tauri/filesystem'
import { transferEntries } from '../services/transfers'
import { useClipboardStore } from '../stores/clipboardStore'
import { usePendingDropStore } from '../stores/pendingDropStore'
import { useProductivityStore } from '../stores/productivityStore'
import { useSelectionStore } from '../stores/selectionStore'
import type { ConflictResolution, TransferScan } from '../types/explorer'

type ConflictState = { sources: string[]; dest: string; cut: boolean; scan: TransferScan }
type Notice = { title: string; message: string }

export function useFileTransfers(titles: { copying: string; moving: string }, onNotice: (notice: Notice) => void) {
  const { currentPath, refresh, removeEntries } = useFileWorkspace()
  const { moveTag } = useOrganizer()
  const { mode, paths: clipPaths, clear: clearClipboard } = useClipboardStore()
  const setSelected = useSelectionStore((state) => state.setSelected)
  const [conflictState, setConflictState] = useState<ConflictState | null>(null)
  const [rehearsalState, setRehearsalState] = useState<ConflictState | null>(null)
  const { copying, moving } = titles
  const runTransfer = useCallback(
    async (sources: string[], dest: string, cut: boolean, resolutions: ConflictResolution[]) => {
      try {
        const summary = await transferEntries(newOperationId(), sources, dest, cut, resolutions)
        if (cut) {
          for (const [source, target] of summary.touched) moveTag(source, target)
          removeEntries(summary.touched.map(([source]) => source))
        }
        if (summary.errors.length) onNotice({ title: cut ? moving : copying, message: summary.errors.join('\n') })
      } catch (reason) {
        onNotice({ title: cut ? moving : copying, message: errorMessage(reason) })
      } finally {
        if (cut) clearClipboard()
        setSelected([])
        await refresh()
      }
    },
    [moveTag, removeEntries, onNotice, moving, copying, clearClipboard, setSelected, refresh]
  )
  const doDrop = useCallback(
    async (sources: string[], dest: string, cut: boolean) => {
      if (!sources.length || !dest || sources.includes(dest)) return
      try {
        const scan = await filesystem.scanTransfer(sources, dest)
        if (useProductivityStore.getState().rehearsal) {
          setRehearsalState({ sources: [...sources], dest, cut, scan })
          return
        }
        if (scan.conflicts.length) {
          setConflictState({ sources: [...sources], dest, cut, scan })
          return
        }
        await runTransfer(sources, dest, cut, [])
      } catch (reason) {
        onNotice({ title: cut ? moving : copying, message: errorMessage(reason) })
      }
    },
    [runTransfer, onNotice, moving, copying]
  )
  const doPaste = useCallback((dest: string) => doDrop([...clipPaths], dest, mode === 'cut'), [clipPaths, mode, doDrop])
  const pendingDrop = usePendingDropStore((state) => state.drop)
  const clearPendingDrop = usePendingDropStore((state) => state.clear)
  useEffect(() => {
    if (!pendingDrop) return
    clearPendingDrop()
    void doDrop(pendingDrop.paths, pendingDrop.dest, pendingDrop.cut)
  }, [pendingDrop, clearPendingDrop, doDrop])
  const confirmRehearsal = () => {
    if (!rehearsalState) return
    const state = rehearsalState
    setRehearsalState(null)
    if (state.scan.conflicts.length) setConflictState(state)
    else void runTransfer(state.sources, state.dest, state.cut, [])
  }
  return { conflictState, setConflictState, rehearsalState, setRehearsalState, confirmRehearsal, runTransfer, doDrop, doPaste, currentPath }
}
