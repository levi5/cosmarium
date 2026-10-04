import type { ButtonHTMLAttributes } from 'react'
import './styles.css'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }
export function Button({ variant = 'secondary', className = '', ...props }: Props) {
  return <button type="button" className={`button button--${variant} ${className}`} {...props} />
}
