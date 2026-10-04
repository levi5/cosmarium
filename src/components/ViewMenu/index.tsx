import { useRef, useState } from 'react'
import type { IconSize } from '../../lib/preferences'
import { Dropdown } from '../base/Dropdown'
import { Icon } from '../base/Icon'
import './styles.css'

type Labels = {
  view: string
  iconSize: string
  iconSmall: string
  iconMedium: string
  iconLarge: string
  showSize: string
}

type Props = {
  iconSize: IconSize
  showSize: boolean
  labels: Labels
  onIconSize: (size: IconSize) => void
  onShowSize: (show: boolean) => void
}

const sizes: IconSize[] = ['small', 'medium', 'large']

export function ViewMenu({ iconSize, showSize, labels, onIconSize, onShowSize }: Props) {
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
      <button ref={anchorRef} type="button" className={`view-menu ${open ? 'is-open' : ''}`} aria-haspopup="menu" aria-expanded={open} onClick={toggle}>
        <Icon name="list" size={15} />
        <span>{labels.view}</span>
        <Icon name="chevronDown" size={12} />
      </button>
      {open && (
        <Dropdown anchor={anchor} onClose={() => setOpen(false)}>
          <p className="dropdown__label">{labels.iconSize}</p>
          {sizes.map((size) => (
            <button
              key={size}
              type="button"
              role="menuitemradio"
              aria-checked={iconSize === size}
              className="dropdown__item"
              onClick={() => {
                onIconSize(size)
                setOpen(false)
              }}
            >
              <span className={`dropdown__preview dropdown__preview--${size}`}>
                <i />
              </span>
              {size === 'small' ? labels.iconSmall : size === 'medium' ? labels.iconMedium : labels.iconLarge}
            </button>
          ))}
          <div className="dropdown__divider" />
          <button type="button" role="menuitemcheckbox" aria-checked={showSize} className="dropdown__item" onClick={() => onShowSize(!showSize)}>
            <span className={`dropdown__switch ${showSize ? 'is-on' : ''}`} aria-hidden="true">
              <i />
            </span>
            {labels.showSize}
          </button>
        </Dropdown>
      )}
    </>
  )
}
