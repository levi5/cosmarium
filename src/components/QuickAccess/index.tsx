import { useEffect, useState } from 'react'
import { Icon } from '../base/Icon'
import { FileIcon } from '../FileIcon'
import '../FileIcon/styles.css'
import { useFileWorkspace } from '../../lib/files'
import { createTranslator } from '../../lib/i18n'
import { useOrganizer } from '../../lib/organizer'
import { usePreferences } from '../../lib/preferences'
import './styles.css'
import { readStorage, STORAGE, writeStorage } from '../../constants/storage'

const locations = [
  ['desktop', 'desktop'],
  ['downloads', 'downloads'],
  ['documents', 'documents'],
  ['pictures', 'pictures'],
  ['music', 'music']
] as const

export function QuickAccess() {
  const { locations: systemLocations, navigateTo } = useFileWorkspace()
  const { quickAccess } = useOrganizer()
  const { language, iconSize } = usePreferences()
  const [expanded, setExpanded] = useState(() => readStorage(STORAGE.quickAccessExpanded) !== 'false')
  const translateText = createTranslator(language)
  useEffect(() => {
    writeStorage(STORAGE.quickAccessExpanded, String(expanded))
  }, [expanded])
  if (!systemLocations) return null
  return (
    <section className="quick-access">
      <button type="button" className="quick-access__heading" onClick={() => setExpanded((current) => !current)} aria-expanded={expanded}>
        <Icon name="chevron" size={13} />
        <span>{translateText('quickAccess')}</span>
      </button>
      {expanded && (
        <div className="quick-access__grid">
          {locations.map(([location, label]) => (
            <button type="button" key={location} onClick={() => navigateTo(systemLocations[location])}>
              <span className="quick-access__icon">
                <FileIcon entry={{ name: label, kind: 'directory' }} size={iconSize} />
              </span>
              <span>{translateText(label)}</span>
              <span className="quick-access__pin">
                <Icon name="pin" size={12} />
              </span>
            </button>
          ))}
          {quickAccess.map((item) => (
            <button type="button" key={item.path} onClick={() => navigateTo(item.path)}>
              <span className="quick-access__icon">
                <FileIcon entry={{ name: item.name, kind: 'directory' }} size={iconSize} />
              </span>
              <span>{item.name}</span>
              <span className="quick-access__pin">
                <Icon name="pin" size={12} />
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
