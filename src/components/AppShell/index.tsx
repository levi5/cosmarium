import { getCurrentWindow } from '@tauri-apps/api/window'
import { type ReactNode, useEffect, useState } from 'react'
import { createTranslator } from '../../lib/i18n'
import { usePreferences } from '../../lib/preferences'
import { Header } from '../Header'
import { Sidebar } from '../Sidebar'
import { StatusBar } from '../StatusBar'
import { TransferProgress } from '../TransferProgress'
import { UndoToast } from '../UndoToast'
import './styles.css'

export function AppShell({ children }: { children: ReactNode }) {
  const { language } = usePreferences()
  const translateText = createTranslator(language)
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    let unlisten: (() => void) | undefined
    let alive = true
    const sync = async () => {
      try {
        const win = getCurrentWindow()
        const isMax = (await win.isMaximized()) || (await win.isFullscreen())
        if (alive) setMaximized(isMax)
      } catch {}
    }
    void sync()
    try {
      getCurrentWindow()
        .onResized(() => {
          void sync()
        })
        .then((off) => {
          if (alive) unlisten = off
          else off()
        })
        .catch(() => {})
    } catch {}
    return () => {
      alive = false
      unlisten?.()
    }
  }, [])

  return (
    <div className={`app-shell${maximized ? ' is-maximized' : ''}`}>
      <Header />
      <div className="app-shell__body">
        <Sidebar />
        <main className="app-content">
          <div className="app-content__scroll">{children}</div>
          <StatusBar />
        </main>
      </div>
      <TransferProgress
        language={language}
        labels={{
          copying: translateText('copying'),
          moving: translateText('moving'),
          trashing: translateText('trashing'),
          cancel: translateText('cancel'),
          close: translateText('close'),
          done: translateText('transferDone'),
          failed: translateText('transferFailed')
        }}
      />
      <UndoToast />
    </div>
  )
}
