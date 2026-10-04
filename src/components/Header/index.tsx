import { getCurrentWindow } from '@tauri-apps/api/window'
import { type MouseEvent, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { TabStrip } from '../../features/tabs/TabStrip'
import { useShortcuts } from '../../hooks/useShortcuts'
import { useFileWorkspace } from '../../lib/files'
import { createTranslator } from '../../lib/i18n'
import { usePreferences } from '../../lib/preferences'
import { useExplorerStore } from '../../stores/explorerStore'
import { useUndoStore } from '../../stores/undoStore'
import { Icon } from '../base/Icon'
import { ShortcutsDialog } from '../ShortcutsDialog'
import './styles.css'

const DRAG_BLOCKERS = '.app-tab, .breadcrumb__seg, button, input, select, textarea, label, a, [role="button"]'

function isDragSurface(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  if (!element || typeof element.closest !== 'function') return false
  return !element.closest(DRAG_BLOCKERS)
}

async function controlWindow(action: 'minimize' | 'toggleMaximize' | 'close') {
  try {
    await getCurrentWindow()[action]()
  } catch {
    return
  }
}

function splitPath(path: string): { label: string; full: string }[] {
  if (!path) return []
  const winDrive = path.match(/^([A-Za-z]:)([\\/]|$)/)
  if (winDrive) {
    const drive = winDrive[1]
    const rest = path
      .slice(drive.length)
      .split(/[\\/]+/)
      .filter(Boolean)
    const out = [{ label: drive, full: `${drive}\\` }]
    let acc = drive
    for (const part of rest) {
      acc += `\\${part}`
      out.push({ label: part, full: acc })
    }
    return out
  }
  const parts = path.split('/').filter(Boolean)
  const out = [{ label: '/', full: '/' }]
  let acc = ''
  for (const part of parts) {
    acc += `/${part}`
    out.push({ label: part, full: acc })
  }
  return out
}

export function Header() {
  const { language } = usePreferences()
  const { currentPath, locations, tabs, activeTabId, goBack, goForward, goUp, refresh, navigateTo } = useFileWorkspace()
  const { createTab, closeTab, restoreClosedTab, setActiveTab } = useExplorerStore()
  const runUndo = useUndoStore((state) => state.run)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const settingsOpen = pathname === '/settings'
  const toggleSettings = () => navigate(settingsOpen ? '/' : '/settings')
  const titlebarRef = useRef<HTMLElement>(null)
  const [copied, setCopied] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const copyTimer = useRef<number | null>(null)
  const [editing, setEditing] = useState(false)
  const [pathDraft, setPathDraft] = useState('')
  const pathInputRef = useRef<HTMLInputElement>(null)
  useEffect(
    () => () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
    },
    []
  )
  const copyCurrentPath = async (event: MouseEvent) => {
    event.stopPropagation()
    if (!currentPath) return
    try {
      await navigator.clipboard.writeText(currentPath)
    } catch {
      const area = document.createElement('textarea')
      area.value = currentPath
      document.body.appendChild(area)
      area.select()
      try {
        document.execCommand('copy')
      } catch {
        return
      }
      area.remove()
    }
    setCopied(true)
    if (copyTimer.current) window.clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => setCopied(false), 1200)
  }
  const translateText = createTranslator(language)
  const activeTab = tabs.find((tab) => tab.id === activeTabId)

  const startPathEdit = () => {
    setPathDraft(currentPath)
    setEditing(true)
  }

  useEffect(() => {
    if (!editing) return
    const node = pathInputRef.current
    node?.focus()
    node?.select()
  }, [editing])

  useEffect(() => {
    if (!editing) setPathDraft(currentPath)
  }, [currentPath, editing])

  const commitPathEdit = () => {
    const target = pathDraft.trim()
    setEditing(false)
    if (target && target !== currentPath) navigateTo(target)
  }

  const cancelPathEdit = () => {
    setEditing(false)
    setPathDraft(currentPath)
  }

  useShortcuts({
    enabled: !shortcutsOpen,
    hasTargets: Boolean(activeTabId),
    handlers: {
      goBack,
      goForward,
      goUp: () => void goUp(),
      refresh: () => void refresh(),
      newTab: () => createTab(currentPath || locations?.home || ''),
      focusPath: () => startPathEdit(),
      closeTab: () => {
        if (activeTabId) closeTab(activeTabId)
      },
      restoreClosedTab,
      nextTab: () => {
        if (tabs.length < 2) return
        const activeIndex = tabs.findIndex((tab) => tab.id === activeTabId)
        setActiveTab(tabs[(activeIndex + 1) % tabs.length].id)
      },
      undo: () => void runUndo(language),
      showShortcuts: () => setShortcutsOpen(true)
    }
  })

  useEffect(() => {
    const node = titlebarRef.current
    if (!node) return
    const onMouseDown = (event: globalThis.MouseEvent) => {
      if (event.button !== 0) return
      if (!isDragSurface(event.target)) return
      void getCurrentWindow()
        .startDragging()
        .catch(() => undefined)
    }
    const onDoubleClick = (event: globalThis.MouseEvent) => {
      if (!isDragSurface(event.target)) return
      void controlWindow('toggleMaximize')
    }
    node.addEventListener('mousedown', onMouseDown)
    node.addEventListener('dblclick', onDoubleClick)
    return () => {
      node.removeEventListener('mousedown', onMouseDown)
      node.removeEventListener('dblclick', onDoubleClick)
    }
  }, [])

  return (
    <header className="titlebar" ref={titlebarRef}>
      <div className="titlebar__chrome">
        <TabStrip />
        <div className="window-controls">
          <button type="button" aria-label="Minimize" onClick={() => controlWindow('minimize')}>
            <Icon name="minimize" size={12} />
          </button>
          <button type="button" aria-label="Maximize" onClick={() => controlWindow('toggleMaximize')}>
            <Icon name="maximize" size={12} />
          </button>
          <button type="button" className="window-controls__close" aria-label="Close" onClick={() => controlWindow('close')}>
            <Icon name="close" size={12} />
          </button>
        </div>
      </div>
      <div className="titlebar__navigation">
        <div className="navigation-actions">
          <button type="button" onClick={goBack} disabled={!activeTab || activeTab.historyIndex === 0} aria-label="Back">
            <Icon name="back" size={16} />
          </button>
          <button type="button" aria-label="Forward" onClick={goForward} disabled={!activeTab || activeTab.historyIndex >= activeTab.history.length - 1}>
            <Icon name="arrow" size={16} />
          </button>
          <button type="button" className="navigation-up" onClick={() => void goUp()} aria-label={translateText('up')}>
            <Icon name="arrow" size={16} />
          </button>
          <button type="button" onClick={() => void refresh()} aria-label={translateText('refresh')}>
            <Icon name="refresh" size={16} />
          </button>
        </div>
        <div className={`breadcrumb ${editing ? 'is-editing' : ''}`} title={currentPath}>
          <button
            type="button"
            className="breadcrumb__home"
            onClick={() => locations && navigateTo(locations.home)}
            aria-label={translateText('home')}
            title={translateText('home')}
          >
            <Icon name="home" size={14} />
          </button>
          {editing ? (
            <input
              ref={pathInputRef}
              className="breadcrumb__input"
              value={pathDraft}
              onChange={(event) => setPathDraft(event.target.value)}
              onBlur={cancelPathEdit}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  commitPathEdit()
                }
                if (event.key === 'Escape') {
                  event.preventDefault()
                  cancelPathEdit()
                }
              }}
              aria-label={translateText('goToPath')}
              spellCheck={false}
              autoComplete="off"
            />
          ) : (
            <>
              <div className="breadcrumb__trail">
                {splitPath(currentPath).map((seg, index, all) => (
                  <span className="breadcrumb__seg" key={seg.full}>
                    <button
                      type="button"
                      className={`breadcrumb__step ${index === all.length - 1 ? 'is-current' : ''}`}
                      onClick={() => navigateTo(seg.full)}
                      title={seg.full}
                    >
                      {index > 0 && index < all.length - 1 && (
                        <span className="breadcrumb__chevron">
                          <Icon name="chevron" size={10} />
                        </span>
                      )}
                      <span className="breadcrumb__label">{seg.label === '/' ? <Icon name="drive" size={13} /> : seg.label}</span>
                    </button>
                  </span>
                ))}
              </div>
              <button
                type="button"
                className="breadcrumb__edit"
                onClick={startPathEdit}
                aria-label={translateText('goToPath')}
                title={translateText('goToPath')}
              >
                <Icon name="rename" size={12} />
              </button>
              <button
                type="button"
                className="breadcrumb__copy"
                onClick={copyCurrentPath}
                aria-label={translateText('copyPath')}
                title={translateText('copyPath')}
              >
                <Icon name={copied ? 'check' : 'file'} size={12} />
              </button>
            </>
          )}
        </div>
        <button
          type="button"
          className={`header-settings${settingsOpen ? ' is-active' : ''}`}
          aria-label={translateText('settings')}
          aria-pressed={settingsOpen}
          onClick={toggleSettings}
        >
          <Icon name="settings" size={16} />
        </button>
      </div>
      {shortcutsOpen && <ShortcutsDialog language={language} onClose={() => setShortcutsOpen(false)} />}
    </header>
  )
}
