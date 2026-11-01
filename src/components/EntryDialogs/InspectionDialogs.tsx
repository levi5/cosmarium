import { ConfirmDialog } from '../../components/ConfirmDialog'
import { PreviewPane } from '../../components/PreviewPane'
import { PropertiesDialog } from '../../components/PropertiesDialog'
import { TagDialog } from '../../components/TagDialog'
import { previewType } from '../../lib/format'
import { createTranslator } from '../../lib/i18n'
import { useOrganizer } from '../../lib/organizer'
import type { Language } from '../../lib/preferences'
import type { Inspection } from './useInspection'

export function InspectionDialogs({ inspection: i, language }: { inspection: Inspection; language: Language }) {
  const t = createTranslator(language)
  const { tags, createTag, assignTag, unassignTag, removeTag } = useOrganizer()
  const previewKind = i.preview ? previewType(i.preview) : null
  const tagTarget = i.tagTarget
  const deleteTagId = i.deleteTagId
  return (
    <>
      {i.propertiesTarget && (
        <PropertiesDialog
          entry={i.propertiesTarget}
          folderLabel={t('folder')}
          language={language}
          labels={{
            title: t('propertiesTitle'),
            name: t('nameField'),
            type: t('typeField'),
            location: t('locationField'),
            size: t('sizeField'),
            contains: t('contains'),
            files: t('filesCount'),
            folders: t('foldersCount'),
            modified: t('modifiedField'),
            calculating: t('sizeUnknown'),
            truncated: t('sizeTruncated'),
            ok: t('ok'),
            cancel: t('cancel')
          }}
          onClose={() => i.setPropertiesTarget(null)}
        />
      )}
      {i.tagTarget && (
        <TagDialog
          tags={tags}
          labels={{
            create: t('createTag'),
            name: t('tagName'),
            cancel: t('cancel'),
            save: t('save'),
            deleteTag: t('deleteTag'),
            unassignTag: t('removeTag'),
            deleteTagConfirm: t('deleteTagEverywhere')
          }}
          onClose={() => i.setTagTarget(null)}
          onAssign={(tagId) => {
            if (tagTarget) assignTag(tagTarget.path, tagId)
            i.setTagTarget(null)
          }}
          onUnassign={(tagId) => {
            if (tagTarget) unassignTag(tagTarget.path, tagId)
          }}
          onDeleteTag={i.setDeleteTagId}
          onCreate={(tag) => {
            const created = createTag(tag)
            if (tagTarget) assignTag(tagTarget.path, created.id)
            i.setTagTarget(null)
          }}
        />
      )}
      {i.deleteTagId && (
        <ConfirmDialog
          title={t('deleteTag')}
          message={t('deleteTagEverywhereMessage').replace('{name}', tags.find((tag) => tag.id === i.deleteTagId)?.name ?? '')}
          confirmLabel={t('delete_')}
          cancelLabel={t('cancel')}
          danger
          onConfirm={() => {
            if (deleteTagId) removeTag(deleteTagId)
            i.setDeleteTagId(null)
          }}
          onClose={() => i.setDeleteTagId(null)}
        />
      )}
      {i.preview && previewKind && (
        <PreviewPane
          entry={i.preview}
          type={previewKind}
          language={language}
          title={
            previewKind === 'audio'
              ? 'Audio'
              : previewKind === 'pdf'
                ? 'PDF'
                : t(previewKind === 'image' ? 'imagePreview' : previewKind === 'video' ? 'videoPreview' : 'textPreview')
          }
          labels={{
            image: t('imagePreview'),
            video: t('videoPreview'),
            text: t('textPreview'),
            loading: t('loading'),
            binary: t('notTextPreview'),
            truncated: t('truncatedPreview'),
            size: t('size'),
            close: t('close')
          }}
          onClose={() => i.setPreview(null)}
        />
      )}
    </>
  )
}
