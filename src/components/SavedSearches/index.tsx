import { useState } from 'react'
import type { Language } from '../../lib/preferences'
import { Dropdown } from '../base/Dropdown'
import { Icon } from '../base/Icon'
import { toolMessages } from '../FileTools/messages'
import './styles.css'

const storageKey = 'cosmarium.saved-searches'
type SavedSearch = { query: string; root: string }

function load(): SavedSearch[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
    return Array.isArray(value)
      ? value.filter((item): item is SavedSearch => Boolean(item) && typeof item.query === 'string' && typeof item.root === 'string').slice(0, 50)
      : []
  } catch {
    return []
  }
}

export function SavedSearches({
  query,
  root,
  language,
  onSelect
}: {
  query: string
  root: string
  language: Language
  onSelect: (search: SavedSearch) => void
}) {
  const [items, setItems] = useState(load)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const labels = toolMessages(language)
  const update = (next: SavedSearch[]) => {
    localStorage.setItem(storageKey, JSON.stringify(next))
    setItems(next)
  }
  return (
    <>
      <button
        type="button"
        className="explorer-toolbar__icon"
        aria-label={labels.savedSearches}
        title={labels.savedSearches}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        onClick={(event) => setAnchor(anchor ? null : event.currentTarget)}
      >
        <Icon name="star" size={16} />
      </button>
      {anchor && (
        <Dropdown anchor={anchor} onClose={() => setAnchor(null)}>
          <button
            type="button"
            role="menuitem"
            className="dropdown__item"
            disabled={!query.trim() || items.some((item) => item.query === query && item.root === root)}
            onClick={() => update([...items, { query, root }].slice(-50))}
          >
            <Icon name="plus" size={16} />
            {labels.saveSearch}
          </button>
          <div className="dropdown__divider" />
          <p className="dropdown__label">
            {labels.savedSearches} ({items.length})
          </p>
          <div className="saved-searches__list">
            {items.map((item, index) => (
              <div className="saved-searches__row" key={`${item.root}:${item.query}`}>
                <button
                  type="button"
                  role="menuitem"
                  className="dropdown__item saved-searches__open"
                  title={`${item.query} — ${item.root}`}
                  onClick={() => {
                    onSelect(item)
                    setAnchor(null)
                  }}
                >
                  <Icon name="search" size={16} />
                  <span className="saved-searches__text">
                    <span>{item.query}</span>
                    <small>{item.root}</small>
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="dropdown__item saved-searches__remove"
                  title={labels.remove}
                  aria-label={`${labels.remove}: ${item.query}`}
                  onClick={() => update(items.filter((_, itemIndex) => itemIndex !== index))}
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
            ))}
          </div>
        </Dropdown>
      )}
    </>
  )
}
