import { useFileWorkspace } from '../../lib/files'
import { createTranslator } from '../../lib/i18n'
import { usePreferences } from '../../lib/preferences'
import { Icon } from '../base/Icon'
import './styles.css'

function size(value: number, language: string) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = value ? Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1) : 0
  return `${new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(value / 1024 ** index)} ${units[index]}`
}

export function DriveOverview() {
  const { volumes, navigateTo } = useFileWorkspace()
  const { language } = usePreferences()
  const translateText = createTranslator(language)
  if (!volumes.length) return null
  return (
    <section className="drive-overview">
      <p className="drive-overview__heading">
        <Icon name="chevron" size={13} />
        {translateText('drives')}
      </p>
      <div className="drive-overview__grid">
        {volumes.map((volume) => {
          const used = volume.total_space ? Math.round((1 - volume.available_space / volume.total_space) * 100) : 0
          return (
            <button type="button" key={volume.mount_point} onClick={() => navigateTo(volume.mount_point)}>
              <Icon name="drive" size={20} />
              <span className="drive-overview__body">
                <strong>{volume.name || volume.mount_point}</strong>
                <span className="drive-overview__bar">
                  <i style={{ width: `${used}%` }} />
                </span>
                <small>
                  {size(volume.available_space, language)} {translateText('freeOf')} {size(volume.total_space, language)}
                </small>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
