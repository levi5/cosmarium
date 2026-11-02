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
  const { quickAccess, hiddenQuickAccess, removeQuickAccess } = useOrganizer()
  const { language, iconSize } = usePreferences()
  const [expanded, setExpanded] = useState(() => readStorage(STORAGE.quickAccessExpanded) !== 'false')
  const translateText = createTranslator(language)
  useEffect(() => {
    writeStorage(STORAGE.quickAccessExpanded, String(expanded))
  }, [expanded])
  if (!systemLocations) return null
  const defaultItems = locations
    .map(([location, label]) => ({ path: systemLocations[location], name: translateText(label) }))
    .filter((item) => !hiddenQuickAccess.includes(item.path))
  const items = [...defaultItems, ...quickAccess.filter((item) => !defaultItems.some((entry) => entry.path === item.path))]
  return (
    <section className="quick-access">
      <button type="button" className="quick-access__heading" onClick={() => setExpanded((current) => !current)} aria-expanded={expanded}>
        <Icon name="chevron" size={13} />
        <span>{translateText('quickAccess')}</span>
      </button>
      {expanded && (
        <div className="quick-access__grid">
          {items.map((item) => (
            <div className="quick-access__item" key={item.path}>
              <button type="button" className="quick-access__open" onClick={() => navigateTo(item.path)}>
                <span className="quick-access__icon">
                  <FileIcon entry={{ name: item.name, kind: 'directory' }} size={iconSize} />
                </span>
                <span>{item.name}</span>
              </button>
              <button
                type="button"
                className="quick-access__pin"
                title={translateText('unpinQuickAccess')}
                aria-label={`${translateText('unpinQuickAccess')}: ${item.name}`}
                onClick={() => removeQuickAccess(item.path)}
              >
                <Icon name="pin" size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
