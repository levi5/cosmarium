import { _try } from 'funcio'
import { useState } from 'react'
import { useFileWorkspace } from '../../lib/files'
import { errorMessage, joinPath } from '../../lib/format'
import { createTranslator } from '../../lib/i18n'
import { newOperationId } from '../../lib/id'
import { useOrganizer } from '../../lib/organizer'
import { usePreferences } from '../../lib/preferences'
import { filesystem } from '../../services/tauri/filesystem'
import { useClipboardStore } from '../../stores/clipboardStore'
import { useSelectionStore } from '../../stores/selectionStore'
import type { FileEntry } from '../../types/explorer'
import { useTask } from '../FileTools/useTask'

export type FormState = { open: boolean; error: string | null }
export const closedForm: FormState = { open: false, error: null }

type ActionWorkspace = Pick<
  ReturnType<typeof useFileWorkspace>,
  'currentPath' | 'entries' | 'refresh' | 'createFolder' | 'createFile' | 'removeEntries' | 'replaceEntry'
>

export function useEntryActions(workspace?: ActionWorkspace, select?: (paths: string[]) => void) {
  const primaryWorkspace = useFileWorkspace()
  const { currentPath, entries, refresh, createFolder, createFile, removeEntries, replaceEntry } = workspace ?? primaryWorkspace
  const { moveTag } = useOrganizer()
  const { language } = usePreferences()
  const t = createTranslator(language)
  const selectPrimary = useSelectionStore((state) => state.setSelected)
  const setSelected = select ?? selectPrimary
  const clearClipboard = useClipboardStore((state) => state.clear)
  const [folderDialog, setFolderDialog] = useState<FormState>(closedForm)
  const [fileDialog, setFileDialog] = useState<FormState>(closedForm)
  const [renameTarget, setRenameTarget] = useState<FileEntry | null>(null)
  const [renameError, setRenameError] = useState<string | null>(null)
  const [deleteTargets, setDeleteTargets] = useState<FileEntry[] | null>(null)
  const [emptyTrashOpen, setEmptyTrashOpen] = useState(false)
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null)
  const { busy, run } = useTask()
  const doRename = (entry: FileEntry) => {
    setRenameError(null)
    setRenameTarget(entry)
  }
  const handleRename = (name: string) =>
    run(async () => {
      if (!renameTarget) return
      const previousPath = renameTarget.path
      const result = await _try.async(() => filesystem.renameEntry(previousPath, name))
      await result.match({
        right: async (entry) => {
          moveTag(previousPath, entry.path)
          replaceEntry(previousPath, entry)
          setRenameTarget(null)
          setSelected([])
          setRenameError(null)
          const undo = await _try.async(() => filesystem.recordRename(previousPath, entry.path))
          undo.match({
            right: () => {},
            left: (reason) => setNotice({ title: t('undoTitle'), message: `${t('renameUndoFailed')}\n${errorMessage(reason)}` })
          })
        },
        left: async (reason) => {
          setRenameError(errorMessage(reason))
          await refresh()
        }
      })
    })
  const handleDelete = () =>
    run(async () => {
      if (!deleteTargets) return
      const paths = deleteTargets.map((entry) => entry.path)
      setDeleteTargets(null)
      const result = await _try.async(async () => {
        const summary = await filesystem.trashEntries(paths, newOperationId())
        removeEntries(summary.removed)
        if (summary.errors.length) setNotice({ title: t('deleteTitle'), message: summary.errors.join('\n') })
        await refresh()
      })
      await result.match({
        right: async () => {},
        left: async (reason) => {
          setNotice({ title: t('deleteTitle'), message: errorMessage(reason) })
          await refresh()
        }
      })
      setSelected([])
      clearClipboard()
    })
  const handleEmptyTrash = () =>
    run(async () => {
      setEmptyTrashOpen(false)
      const result = await _try.async(async () => {
        await filesystem.emptyTrash()
        setSelected([])
      })
      result.match({
        right: () => {},
        left: (reason) => setNotice({ title: t('emptyTrashTitle'), message: errorMessage(reason) })
      })
      await refresh()
    })
  const create = (kind: 'folder' | 'file', name: string) =>
    run(async () => {
      const setDialog = kind === 'folder' ? setFolderDialog : setFileDialog
      const result = await _try.async(async () => {
        if (kind === 'folder') await createFolder(name)
        else await createFile(name)
        await filesystem.recordCreated([joinPath(currentPath, name)])
      })
      result.match({
        right: () => setDialog(closedForm),
        left: (reason) => setDialog({ open: true, error: errorMessage(reason) })
      })
    })
  return {
    folderDialog,
    setFolderDialog,
    fileDialog,
    setFileDialog,
    renameTarget,
    setRenameTarget,
    renameError,
    deleteTargets,
    setDeleteTargets,
    emptyTrashOpen,
    setEmptyTrashOpen,
    notice,
    setNotice,
    deleting: busy,
    doRename,
    handleRename,
    handleDelete,
    handleEmptyTrash,
    create,
    entryCount: entries.length,
    hasDialog: Boolean(busy || folderDialog.open || fileDialog.open || renameTarget || deleteTargets || emptyTrashOpen || notice)
  }
}

export type EntryActions = ReturnType<typeof useEntryActions>
