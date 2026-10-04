import { useState } from 'react'
import { Button } from '../../components/base/Button'
import { Icon } from '../../components/base/Icon'
import { DriveOverview } from '../../components/DriveOverview'
import { FileBrowser } from '../../components/FileBrowser'
import { PromptDialog } from '../../components/PromptDialog'
import { QuickAccess } from '../../components/QuickAccess'
import { useFileWorkspace } from '../../lib/files'
import { createTranslator } from '../../lib/i18n'
import { usePreferences } from '../../lib/preferences'
import './styles.css'

export function Home() {
  const { language, showRecent } = usePreferences()
  const { createFolder, currentPath, locations } = useFileWorkspace()
  const translateText = createTranslator(language)
  const atHome = currentPath === locations?.home
  const title = atHome ? translateText('home') : currentPath.split(/[\\/]/).filter(Boolean).pop() || translateText('home')
  const [folderDialog, setFolderDialog] = useState<{ open: boolean; error: string | null }>({ open: false, error: null })
  const handleCreateFolder = async (name: string) => {
    try {
      await createFolder(name)
      setFolderDialog({ open: false, error: null })
    } catch (reason) {
      setFolderDialog({ open: true, error: typeof reason === 'string' ? reason : reason instanceof Error ? reason.message : String(reason) })
    }
  }
  return (
    <section className="home-page">
      <div className="home-actions">
        <h1 title={title}>{title}</h1>
        <Button
          variant="ghost"
          className="home-new-folder"
          aria-label={translateText('newFolder')}
          onClick={() => setFolderDialog({ open: true, error: null })}
        >
          <Icon name="more" size={14} />
        </Button>
      </div>
      {atHome ? (
        <>
          <section className="home-panel">
            <QuickAccess />
            <DriveOverview />
            {showRecent && <FileBrowser compact />}
          </section>
          {!showRecent && <FileBrowser />}
        </>
      ) : (
        <FileBrowser />
      )}
      {folderDialog.open && (
        <PromptDialog
          title={translateText('newFolder')}
          placeholder={translateText('newFolderPrompt')}
          confirmLabel={translateText('create')}
          cancelLabel={translateText('cancel')}
          externalError={folderDialog.error}
          onSubmit={(name) => void handleCreateFolder(name)}
          onClose={() => setFolderDialog({ open: false, error: null })}
        />
      )}
    </section>
  )
}
