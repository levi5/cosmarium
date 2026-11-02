import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react'
import { STORAGE } from '../constants/storage'

export type Theme = 'dark' | 'light'
export type Language = 'pt-BR' | 'en'

type Preferences = {
  theme: Theme
  language: Language
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setLanguage: (language: Language) => void
  toggleLanguage: () => void
}

const PreferencesContext = createContext<Preferences | null>(null)

function initialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  try {
    const stored = window.localStorage.getItem(STORAGE.theme)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {}
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function initialLanguage(): Language {
  if (typeof window === 'undefined') return 'pt-BR'
  try {
    const stored = window.localStorage.getItem(STORAGE.language)
    if (stored === 'pt-BR' || stored === 'en') return stored
  } catch {}
  return 'pt-BR'
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(initialTheme)
  const [language, setLanguageState] = useState<Language>(initialLanguage)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      window.localStorage.setItem(STORAGE.theme, theme)
    } catch {}
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = language
    try {
      window.localStorage.setItem(STORAGE.language, language)
    } catch {}
  }, [language])

  const setTheme = useCallback((next: Theme) => setThemeState(next), [])
  const setLanguage = useCallback((next: Language) => setLanguageState(next), [])
  const toggleTheme = useCallback(() => setThemeState((current) => (current === 'dark' ? 'light' : 'dark')), [])
  const toggleLanguage = useCallback(() => setLanguageState((current) => (current === 'pt-BR' ? 'en' : 'pt-BR')), [])

  return (
    <PreferencesContext.Provider value={{ theme, language, setTheme, toggleTheme, setLanguage, toggleLanguage }}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences(): Preferences {
  const context = useContext(PreferencesContext)
  if (!context) throw new Error('usePreferences precisa ser usado dentro de PreferencesProvider')
  return context
}
