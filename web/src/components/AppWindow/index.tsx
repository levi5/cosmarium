import { usePreferences } from '../../lib/preferences'
import './styles.css'

export function AppWindow() {
  const { language, theme } = usePreferences()
  const locale = language === 'pt-BR' ? 'pt' : 'en'

  return (
    <img
      className="app-window"
      src={`${import.meta.env.BASE_URL}screenshots/cosmarium-${locale}-${theme}.png`}
      alt=""
      width={1280}
      height={900}
    />
  )
}
