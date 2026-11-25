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

type ConflictState = { sources: string[]; dest: string; cut: boolean; scan: TransferScan; fixNames?: boolean }
type Notice = { title: string; message: string }

export function useFileTransfers(titles: { copying: string; moving: string }, onNotice: (notice: Notice) => void) {
  const { currentPath, refresh, removeEntries } = useFileWorkspace()
  const { moveTag } = useOrganizer()
  const { mode, paths: clipPaths, clear: clearClipboard } = useClipboardStore()
  const setSelected = useSelectionStore((state) => state.setSelected)
  const [conflictState, setConflictState] = useState<ConflictState | null>(null)
  const [rehearsalState, setRehearsalState] = useState<ConflictState | null>(null)
  const [nameCorrectionState, setNameCorrectionState] = useState<ConflictState | null>(null)
  const { copying, moving } = titles
  const runTransfer = useCallback(
    async (sources: string[], dest: string, cut: boolean, resolutions: ConflictResolution[], fixNames = false) => {
      try {
        const summary = await transferEntries(newOperationId(), sources, dest, cut, resolutions, fixNames)
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
  const reviewTransfer = useCallback(
    async (state: ConflictState) => {
      if (useProductivityStore.getState().rehearsal) {
        setRehearsalState(state)
      } else if (state.scan.conflicts.length) {
        setConflictState(state)
      } else {
        await runTransfer(state.sources, state.dest, state.cut, [], state.fixNames)
      }
    },
    [runTransfer]
  )
  const doDrop = useCallback(
    async (sources: string[], dest: string, cut: boolean) => {
      if (!sources.length || !dest || sources.includes(dest)) return
      try {
        const scan = await filesystem.scanTransfer(sources, dest)
        const state = { sources: [...sources], dest, cut, scan }
        if (!cut && scan.name_changes?.length) {
          setNameCorrectionState(state)
          return
        }
        await reviewTransfer(state)
      } catch (reason) {
        onNotice({ title: cut ? moving : copying, message: errorMessage(reason) })
      }
    },
    [reviewTransfer, onNotice, moving, copying]
  )
  const confirmNameCorrection = async () => {
    if (!nameCorrectionState) return
    const state = nameCorrectionState
    setNameCorrectionState(null)
    try {
      const scan = await filesystem.scanTransfer(state.sources, state.dest, true)
      await reviewTransfer({ ...state, scan, fixNames: true })
    } catch (reason) {
      onNotice({ title: copying, message: errorMessage(reason) })
    }
  }
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
    else void runTransfer(state.sources, state.dest, state.cut, [], state.fixNames)
  }
  return {
    conflictState,
    setConflictState,
    rehearsalState,
    setRehearsalState,
    confirmRehearsal,
    nameCorrectionState,
    setNameCorrectionState,
    confirmNameCorrection,
    runTransfer,
    doDrop,
    doPaste,
    currentPath
  }
}
