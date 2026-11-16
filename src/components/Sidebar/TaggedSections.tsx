import { useState } from 'react'
import { createTranslator } from '../../lib/i18n'
import { pathsForSection, type TagSection, useOrganizer } from '../../lib/organizer'
import { usePreferences } from '../../lib/preferences'
import { Button } from '../base/Button'
import { Dialog } from '../base/Dialog'
import { Icon } from '../base/Icon'
import '../TagDialog/styles.css'

export function TaggedSections({ onOpen }: { onOpen: (path: string) => void }) {
  const { language } = usePreferences()
  const t = createTranslator(language)
  const { tags, tagSections, taggedPaths, saveTagSection, removeTagSection } = useOrganizer()
  const [editing, setEditing] = useState<Partial<TagSection> | null>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  return (
    <>
      <button type="button" className="nav-item nav-add-section" onClick={() => setEditing({ name: '', tagIds: [] })}>
        <span className="nav-icon">
          <Icon name="plus" size={16} />
        </span>
        <span className="nav-item__label">{t('addTagSection')}</span>
      </button>
      {tagSections.map((section) => {
        const paths = pathsForSection(section, taggedPaths)
        return (
          <div className="nav-section" key={section.id}>
            <div className="nav-section-header">
              <button
                type="button"
                className="nav-heading"
                aria-expanded={!collapsed[section.id]}
                title={section.name}
                onClick={() => setCollapsed((current) => ({ ...current, [section.id]: !current[section.id] }))}
              >
                <span className="nav-heading__label">
                  {section.name} ({paths.length})
                </span>
                <Icon name="chevronDown" size={12} />
              </button>
              <button type="button" className="nav-section-edit" aria-label={`${t('editTagSection')}: ${section.name}`} onClick={() => setEditing(section)}>
                <Icon name="settings" size={14} />
              </button>
            </div>
            {!collapsed[section.id] && (
              <div className="nav-section__items">
                {paths.length === 0 && <p className="nav-section-empty">{t('tagSectionEmpty')}</p>}
                {paths.map((path) => (
                  <button type="button" className="nav-item" key={path} title={path} onClick={() => onOpen(path)}>
                    <span className="nav-icon">
                      <Icon name="tag" size={16} />
                    </span>
                    <span className="nav-item__label">{path.split(/[/\\]/).filter(Boolean).pop() || path}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
      {editing && (
        <Dialog backdropClass="tag-backdrop" dismissLabel={t(editing.id ? 'editTagSection' : 'addTagSection')} onClose={() => setEditing(null)}>
          <form
            className="tag-dialog tag-section-dialog"
            onSubmit={(event) => {
              event.preventDefault()
              if (!editing.name?.trim() || !editing.tagIds?.length) return
              saveTagSection({ ...editing, name: editing.name, tagIds: editing.tagIds })
              setEditing(null)
            }}
          >
            <strong>{t(editing.id ? 'editTagSection' : 'addTagSection')}</strong>
            <input
              autoFocus
              aria-label={t('tagSectionName')}
              placeholder={t('tagSectionName')}
              maxLength={128}
              value={editing.name || ''}
              onChange={(event) => setEditing({ ...editing, name: event.target.value })}
            />
            <p className="tag-section-hint">{t('tagSectionHint')}</p>
            <fieldset className="tag-section-options">
              <legend>{t('tagsTitle')}</legend>
              {tags.length === 0 && <p>{t('tagSectionNoTags')}</p>}
              {tags.map((tag) => (
                <label key={tag.id}>
                  <input
                    type="checkbox"
                    checked={editing.tagIds?.includes(tag.id) || false}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        tagIds: event.target.checked ? [...(editing.tagIds || []), tag.id] : editing.tagIds?.filter((id) => id !== tag.id)
                      })
                    }
                  />
                  <span className="tag-section-check" aria-hidden="true">
                    <Icon name="check" size={12} />
                  </span>
                  <span className="tag-section-emoji" style={{ color: tag.color }}>
                    {tag.emoji}
                  </span>
                  <span className="tag-section-name">{tag.name}</span>
                </label>
              ))}
            </fieldset>
            <div className="tag-dialog__actions">
              {editing.id && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    if (editing.id) removeTagSection(editing.id)
                    setEditing(null)
                  }}
                >
                  {t('removeTagSection')}
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                {t('cancel')}
              </Button>
              <Button type="submit" variant="primary" disabled={!editing.name?.trim() || !editing.tagIds?.length}>
                {t('save')}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  )
}
