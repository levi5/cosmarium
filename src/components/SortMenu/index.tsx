import { useRef, useState } from 'react'
import type { SortDirection, SortKey } from '../../types/explorer'
import { Dropdown } from '../base/Dropdown'
import { Icon } from '../base/Icon'
import './styles.css'

type Labels = {
  sort: string
  byName: string
  byModified: string
  byAccessed: string
  byType: string
  bySize: string
  ascending: string
  descending: string
}

type Props = {
  sortKey: SortKey
  sortDirection: SortDirection
  labels: Labels
  onSort: (key: SortKey) => void
  onDirection: (direction: SortDirection) => void
}

const keys: { key: SortKey; label: keyof Pick<Labels, 'byName' | 'byModified' | 'byAccessed' | 'byType' | 'bySize'> }[] = [
  { key: 'name', label: 'byName' },
  { key: 'modified', label: 'byModified' },
  { key: 'accessed', label: 'byAccessed' },
  { key: 'type', label: 'byType' },
  { key: 'size', label: 'bySize' }
]

export function SortMenu({ sortKey, sortDirection, labels, onSort, onDirection }: Props) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)

  const toggle = () => {
    if (open) {
      setOpen(false)
      return
    }
    setAnchor(anchorRef.current)
    setOpen(true)
  }

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className="explorer-toolbar__icon"
        aria-label={labels.sort}
        title={labels.sort}
        aria-expanded={open}
        onClick={toggle}
      >
        <Icon name="sort" size={16} />
      </button>
      {open && anchor && (
        <Dropdown anchor={anchor} onClose={() => setOpen(false)}>
          <div className="dropdown__label">{labels.sort}</div>
          {keys.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitemradio"
              className="dropdown__item"
              aria-checked={sortKey === item.key}
              onClick={() => {
                onSort(item.key)
                setOpen(false)
              }}
            >
              <span className="dropdown__check">{sortKey === item.key && <Icon name="check" size={13} />}</span>
              {labels[item.label]}
            </button>
          ))}
          <div className="dropdown__divider" />
          <button type="button" role="menuitemradio" className="dropdown__item" aria-checked={sortDirection === 'asc'} onClick={() => onDirection('asc')}>
            <span className="dropdown__check">{sortDirection === 'asc' && <Icon name="check" size={13} />}</span>
            {labels.ascending}
          </button>
          <button type="button" role="menuitemradio" className="dropdown__item" aria-checked={sortDirection === 'desc'} onClick={() => onDirection('desc')}>
            <span className="dropdown__check">{sortDirection === 'desc' && <Icon name="check" size={13} />}</span>
            {labels.descending}
          </button>
        </Dropdown>
      )}
    </>
  )
}
