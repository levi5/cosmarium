import { createContext, type Dispatch, type ReactNode, type SetStateAction, useContext, useEffect, useState } from 'react'
import { readStorage, type StorageKey, STORAGE, writeStorage } from '../constants/storage'

export type Theme = 'dark' | 'light'
export type Accent = 'violet' | 'blue' | 'coral' | 'lime' | 'custom'
export type Language = 'pt-BR' | 'en'
export type Material = 'solid' | 'mica' | 'acrylic'
export type IconSize = 'small' | 'medium' | 'large'

type Preferences = {
  theme: Theme
  accent: Accent
  customAccent: string
  language: Language
  material: Material
  showSize: boolean
  iconSize: IconSize
  showHidden: boolean
  showRecent: boolean
  setTheme: (theme: Theme) => void
  setAccent: (accent: Accent) => void
  setCustomAccent: (color: string) => void
  setLanguage: (language: Language) => void
  setMaterial: (material: Material) => void
  setShowSize: (showSize: boolean) => void
  setIconSize: (iconSize: IconSize) => void
  setShowHidden: (show: boolean) => void
  setShowRecent: (show: boolean) => void
}

type StorageParser<T> = (stored: string | null) => T

const PreferencesContext = createContext<Preferences | null>(null)

const presetAccents: Record<Exclude<Accent, 'custom'>, { main: string; soft: string }> = {
  violet: { main: '#9b7cff', soft: '#9b7cff24' },
  blue: { main: '#3b9eff', soft: '#3b9eff24' },
  coral: { main: '#ff776b', soft: '#ff776b24' },
  lime: { main: '#9bdc58', soft: '#9bdc5824' }
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

function accentFor(accent: Accent, custom: string) {
  if (accent === 'custom' && HEX_COLOR.test(custom)) return { main: custom, soft: `${custom}24` }
  return presetAccents[accent as Exclude<Accent, 'custom'>] ?? presetAccents.violet
}

function asEnum<T extends string>(fallback: T): StorageParser<T> {
  return (stored) => (stored as T) || fallback
}

function asText(fallback: string): StorageParser<string> {
  return (stored) => stored ?? fallback
}

function asBoolean(fallback: boolean): StorageParser<boolean> {
  return (stored) => (stored === null ? fallback : stored === 'true')
}

function useStoredState<T>(key: StorageKey, parse: StorageParser<T>): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => parse(readStorage(key)))
  useEffect(() => {
    writeStorage(key, String(value))
  }, [key, value])
  return [value, setValue]
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
}

function applyMaterial(material: Material) {
  document.documentElement.dataset.material = material
}

function applyAccent(accent: Accent, customAccent: string) {
  const resolved = accentFor(accent, customAccent)
  document.documentElement.style.setProperty('--accent', resolved.main)
  document.documentElement.style.setProperty('--accent-soft', resolved.soft)
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useStoredState<Theme>(STORAGE.theme, asEnum('dark'))
  const [accent, setAccent] = useStoredState<Accent>(STORAGE.accent, asEnum('violet'))
  const [customAccent, setCustomAccent] = useStoredState(STORAGE.customAccent, asText('#3b9eff'))
  const [language, setLanguage] = useStoredState<Language>(STORAGE.language, asEnum('pt-BR'))
  const [material, setMaterial] = useStoredState<Material>(STORAGE.material, asEnum('solid'))
  const [showSize, setShowSize] = useStoredState(STORAGE.showSize, asBoolean(true))
  const [iconSize, setIconSize] = useStoredState<IconSize>(STORAGE.iconSize, asEnum('medium'))
  const [showHidden, setShowHidden] = useStoredState(STORAGE.showHidden, asBoolean(false))
  const [showRecent, setShowRecent] = useStoredState(STORAGE.showRecent, asBoolean(true))

  useEffect(() => applyTheme(theme), [theme])
  useEffect(() => applyMaterial(material), [material])
  useEffect(() => applyAccent(accent, customAccent), [accent, customAccent])

  return (
    <PreferencesContext.Provider
      value={{
        theme,
        accent,
        customAccent,
        language,
        material,
        showSize,
        iconSize,
        showHidden,
        showRecent,
        setTheme,
        setAccent,
        setCustomAccent,
        setLanguage,
        setMaterial,
        setShowSize,
        setIconSize,
        setShowHidden,
        setShowRecent
      }}
    >
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences(): Preferences {
  const value = useContext(PreferencesContext)
  if (!value) throw new Error('usePreferences must be used within PreferencesProvider')
  return value
}
