import type { ComponentProps } from 'react'
import { Button } from '../Button'
import { Icon, type IconName } from '../Icon'
import './styles.css'

type Props = Omit<ComponentProps<typeof Button>, 'variant' | 'aria-label'> & { icon: IconName; label: string }

export function IconButton({ icon, label, className = '', children, ...props }: Props) {
  return (
    <Button {...props} variant="ghost" className={`icon-button ${className}`} aria-label={label} title={label}>
      <Icon name={icon} size={16} />
      {children}
    </Button>
  )
}
