import type { ButtonHTMLAttributes } from 'react'
import './styles.css'

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'onClick' | 'children'> & {
  checked: boolean
  onChange: (checked: boolean) => void
}

export function Switch({ checked, onChange, className = '', ...props }: Props) {
  return (
    <button
      {...props}
      type="button"
      role="switch"
      aria-checked={checked}
      className={`switch${checked ? ' is-on' : ''}${className ? ` ${className}` : ''}`}
      onClick={() => onChange(!checked)}
    >
      <i aria-hidden="true" />
    </button>
  )
}
