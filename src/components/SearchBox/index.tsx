import { type RefObject, useEffect } from 'react'
import { Icon } from '../base/Icon'
import './styles.css'

type Props = {
  value: string
  searching: boolean
  placeholder: string
  clearLabel: string
  hint?: string
  inputRef?: RefObject<HTMLInputElement>
  onChange: (value: string) => void
}

export function SearchBox({ value, searching, placeholder, clearLabel, hint, inputRef, onChange }: Props) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && value) {
        event.stopPropagation()
        onChange('')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [value, onChange])

  return (
    <div className="search-box" title={hint}>
      <Icon name="search" size={14} />
      <input
        ref={inputRef}
        type="search"
        value={value}
        spellCheck={false}
        autoComplete="off"
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') inputRef?.current?.blur()
        }}
      />
      {searching && <span className="search-box__spinner" aria-hidden="true" />}
      {value && !searching && (
        <button type="button" className="search-box__clear" aria-label={clearLabel} title={clearLabel} onClick={() => onChange('')}>
          <Icon name="close" size={12} />
        </button>
      )}
    </div>
  )
}
