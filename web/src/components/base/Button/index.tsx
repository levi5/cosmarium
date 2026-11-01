import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react'
import './styles.css'

type Variant = 'primary' | 'secondary' | 'ghost'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant }

export function Button({ variant = 'secondary', className = '', ...props }: ButtonProps) {
  return <button type="button" className={`button button--${variant} ${className}`} {...props} />
}

export function ButtonLink({ variant = 'secondary', className = '', ...props }: ButtonLinkProps) {
  return <a className={`button button--${variant} ${className}`} {...props} />
}
