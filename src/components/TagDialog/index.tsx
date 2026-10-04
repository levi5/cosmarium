import { type FormEvent, useState } from 'react'
import { TAG_COLORS, TAG_EMOJIS } from '../../constants/files'
import { createTranslator } from '../../lib/i18n'
import type { Tag } from '../../lib/organizer'
import { usePreferences } from '../../lib/preferences'
import { Button } from '../base/Button'
import { Icon } from '../base/Icon'
import './styles.css'
import { Dialog } from '../base/Dialog'

type Labels = { create: string; name: string; cancel: string; save: string; deleteTag: string; unassignTag: string; deleteTagConfirm: string }
type Props = {
  tags: Tag[]
  labels: Labels
  onAssign: (tagId: string) => void
  onUnassign: (tagId: string) => void
  onDeleteTag: (tagId: string) => void
  onCreate: (tag: Omit<Tag, 'id'>) => void
  onClose: () => void
}

export function TagDialog({ tags, labels, onAssign, onUnassign, onDeleteTag, onCreate, onClose }: Props) {
  const { language } = usePreferences()
  const translateText = createTranslator(language)
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(TAG_COLORS[0])
  const [emoji, setEmoji] = useState<string>(TAG_EMOJIS[0])
  const isCustomColor = !(TAG_COLORS as readonly string[]).includes(color)
  const save = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    onCreate({ name: name.trim(), color, emoji })
  }
  return (
    <Dialog backdropClass="tag-backdrop" dismissLabel={labels.cancel} onClose={onClose}>
      <form className="tag-dialog" onSubmit={save} onMouseDown={(event) => event.stopPropagation()}>
        <div className="tag-dialog__top">
          <strong>{labels.create}</strong>
          <button type="button" onClick={onClose} aria-label={labels.cancel}>
            <Icon name="close" size={14} />
          </button>
        </div>
        {tags.length > 0 && (
          <div className="tag-dialog__existing">
            {tags.map((tag) => (
              <span className="tag-chip" key={tag.id} style={{ '--tag-color': tag.color } as React.CSSProperties}>
                <button type="button" className="tag-chip__assign" onClick={() => onAssign(tag.id)}>
                  <span>{tag.emoji}</span>
                  {tag.name}
                </button>
                <button
                  type="button"
                  className="tag-chip__remove"
                  onClick={() => onUnassign(tag.id)}
                  aria-label={`${labels.unassignTag}: ${tag.name}`}
                  title={`${labels.unassignTag}: ${tag.name}`}
                >
                  <Icon name="close" size={11} />
                </button>
                <button
                  type="button"
                  className="tag-chip__delete"
                  onClick={() => onDeleteTag(tag.id)}
                  aria-label={`${labels.deleteTagConfirm}: ${tag.name}`}
                  title={`${labels.deleteTagConfirm}: ${tag.name}`}
                >
                  <Icon name="trash" size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
        <input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder={labels.name} />
        <div className="tag-dialog__choices">
          <div>
            {TAG_EMOJIS.map((item) => (
              <button type="button" key={item} className={emoji === item ? 'selected' : ''} onClick={() => setEmoji(item)} aria-label={item}>
                {item}
              </button>
            ))}
          </div>
          <div>
            {TAG_COLORS.map((item) => (
              <button
                type="button"
                key={item}
                className={`tag-color ${color === item ? 'selected' : ''}`}
                style={{ background: item }}
                onClick={() => setColor(item)}
                aria-label={item}
              />
            ))}
            <label
              className={`tag-color tag-color--custom ${isCustomColor ? 'selected' : ''}`}
              style={isCustomColor ? { background: color } : undefined}
              title={translateText('customColor')}
              aria-label={translateText('customColor')}
            >
              {!isCustomColor && <Icon name="plus" size={12} />}
              <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : TAG_COLORS[0]} onChange={(event) => setColor(event.target.value)} />
            </label>
          </div>
        </div>
        <div className="tag-dialog__actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            {labels.cancel}
          </Button>
          <Button type="submit" variant="primary">
            {labels.save}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
