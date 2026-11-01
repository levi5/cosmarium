import { ConfirmDialog } from '../../components/ConfirmDialog'
import { PromptDialog } from '../../components/PromptDialog'
import { createTranslator } from '../../lib/i18n'
import type { Language } from '../../lib/preferences'
import { closedForm, type EntryActions } from './useEntryActions'

export function EntryDialogs({ actions: a, language }: { actions: EntryActions; language: Language }) {
  const t = createTranslator(language)
  return (
    <>
      {(['folder', 'file'] as const).map((kind) => {
        const form = kind === 'folder' ? a.folderDialog : a.fileDialog
        const setForm = kind === 'folder' ? a.setFolderDialog : a.setFileDialog
        return (
          form.open && (
            <PromptDialog
              key={kind}
              title={t(kind === 'folder' ? 'newFolder' : 'newFile')}
              placeholder={t(kind === 'folder' ? 'newFolderPrompt' : 'newFilePrompt')}
              confirmLabel={t('create')}
              cancelLabel={t('cancel')}
              externalError={form.error}
              busy={a.deleting}
              onSubmit={(name) => void a.create(kind, name)}
              onClose={() => setForm(closedForm)}
            />
          )
        )
      })}
      {a.renameTarget && (
        <PromptDialog
          title={t('renameTitle')}
          placeholder={t('nameField')}
          initialValue={a.renameTarget.name}
          confirmLabel={t('rename')}
          cancelLabel={t('cancel')}
          externalError={a.renameError}
          busy={a.deleting}
          onSubmit={(name) => void a.handleRename(name)}
          onClose={() => a.setRenameTarget(null)}
        />
      )}
      {a.deleteTargets && (
        <ConfirmDialog
          title={t('deleteTitle')}
          message={t('deleteMessage').replace('{count}', String(a.deleteTargets.length))}
          confirmLabel={t('delete_')}
          cancelLabel={t('cancel')}
          danger
          onConfirm={() => void a.handleDelete()}
          onClose={() => a.setDeleteTargets(null)}
        />
      )}
      {a.emptyTrashOpen && (
        <ConfirmDialog
          title={t('emptyTrashTitle')}
          message={t('emptyTrashMessage').replace('{count}', String(a.entryCount))}
          confirmLabel={t('emptyTrash')}
          cancelLabel={t('cancel')}
          danger
          onConfirm={() => void a.handleEmptyTrash()}
          onClose={() => a.setEmptyTrashOpen(false)}
        />
      )}
      {a.notice && (
        <ConfirmDialog
          title={a.notice.title}
          message={a.notice.message}
          confirmLabel={t('ok')}
          cancelLabel={t('cancel')}
          hideCancel
          onConfirm={() => a.setNotice(null)}
          onClose={() => a.setNotice(null)}
        />
      )}
    </>
  )
}
