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

export function useEntryActions() {
  const { currentPath, entries, refresh, createFolder, createFile, removeEntries, replaceEntry } = useFileWorkspace()
  const { moveTag } = useOrganizer()
  const { language } = usePreferences()
  const t = createTranslator(language)
  const setSelected = useSelectionStore((state) => state.setSelected)
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
      try {
        const entry = await filesystem.renameEntry(previousPath, name)
        await filesystem.recordRename(previousPath, entry.path)
        moveTag(previousPath, entry.path)
        replaceEntry(previousPath, entry)
        setRenameTarget(null)
        setSelected([])
        setRenameError(null)
      } catch (reason) {
        setRenameError(errorMessage(reason))
        await refresh()
      }
    })
  const handleDelete = () =>
    run(async () => {
      if (!deleteTargets) return
      const paths = deleteTargets.map((entry) => entry.path)
      setDeleteTargets(null)
      try {
        await filesystem.trashEntries(paths, newOperationId())
        removeEntries(paths)
      } catch (reason) {
        setNotice({ title: t('deleteTitle'), message: errorMessage(reason) })
        await refresh()
      } finally {
        setSelected([])
        clearClipboard()
      }
    })
  const handleEmptyTrash = () =>
    run(async () => {
      setEmptyTrashOpen(false)
      try {
        await filesystem.emptyTrash()
        setSelected([])
      } catch (reason) {
        setNotice({ title: t('emptyTrashTitle'), message: errorMessage(reason) })
      } finally {
        await refresh()
      }
    })
  const create = (kind: 'folder' | 'file', name: string) =>
    run(async () => {
      const setDialog = kind === 'folder' ? setFolderDialog : setFileDialog
      try {
        if (kind === 'folder') await createFolder(name)
        else await createFile(name)
        await filesystem.recordCreated([joinPath(currentPath, name)])
        setDialog(closedForm)
      } catch (reason) {
        setDialog({ open: true, error: errorMessage(reason) })
      }
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
