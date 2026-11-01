import './styles.css'

type Props = {
  eyebrow: string
  title: string
  description?: string
  align?: 'start' | 'center'
}

export function SectionHeading({ eyebrow, title, description, align = 'start' }: Props) {
  return (
    <div className={`section-heading section-heading--${align}`} data-reveal>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="section-title">{title}</h2>
      {description && <p className="section-copy">{description}</p>}
    </div>
  )
}
