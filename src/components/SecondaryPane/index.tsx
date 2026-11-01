import { listen } from '@tauri-apps/api/event'
import { useEffect, useMemo, useState } from 'react'
import type { ViewMode } from '../../constants/view'
import { useFolderSizes } from '../../hooks/useFolderSizes'
import { errorMessage } from '../../lib/format'
import { createTranslator } from '../../lib/i18n'
import { usePreferences } from '../../lib/preferences'
import { sortEntries } from '../../lib/search'
import { filesystem } from '../../services/tauri/filesystem'
import { useClipboardStore } from '../../stores/clipboardStore'
import type { FileEntry, SortDirection, SortKey, TransferProgress } from '../../types/explorer'
import { Icon } from '../base/Icon'
import { IconButton } from '../base/IconButton'
import { FileTable } from '../FileBrowser/FileTable'
import { toolMessages } from '../FileTools/messages'
import { PaneToolbar } from './PaneToolbar'
import { useDirectoryPane } from './useDirectoryPane'
import './styles.css'

type Props = {
  view?: ViewMode
  sortKey?: SortKey
  sortDirection?: SortDirection
  initialPath: string
  primaryPath: string
  primarySources: string[]
  onChanged: () => void
  onTransfer: (sources: string[], dest: string, cut: boolean) => Promise<void>
}

export function SecondaryPane({
  initialPath,
  primaryPath,
  primarySources,
  onChanged,
  onTransfer,
  view = 'list',
  sortKey = 'name',
  sortDirection = 'asc'
}: Props) {
  const { path, navigate, entries, loading, error, watchError, refresh } = useDirectoryPane(initialPath)
  const { language, iconSize, showHidden, showSize } = usePreferences()
  const folderSizes = useFolderSizes(entries, showSize)
  const visibleEntries = useMemo(
    () =>
      sortEntries(
        entries.filter((entry) => showHidden || !entry.hidden),
        sortKey,
        sortDirection
      ),
    [entries, showHidden, sortKey, sortDirection]
  )
  const t = createTranslator(language)
  const labels = toolMessages(language)
  const [selected, setSelected] = useState<string[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const clipboard = useClipboardStore()
  useEffect(() => {
    let alive = true
    let unlisten: (() => void) | undefined
    listen<TransferProgress>('cosmarium://transfer-progress', ({ payload }) => {
      if (alive && payload.finished) void refresh()
    })
      .then((off) => {
        if (alive) unlisten = off
        else off()
      })
      .catch((reason) => setFailure(errorMessage(reason)))
    return () => {
      alive = false
      unlisten?.()
    }
  }, [refresh])
  const go = (next: string) => {
    navigate(next)
    setSelected([])
    setActive(null)
  }
  const open = (entry: FileEntry) => {
    if (entry.kind === 'directory') go(entry.path)
    else void filesystem.openWithDefault(entry.path).catch((reason) => setFailure(errorMessage(reason)))
  }
  const transfer = async (sources: string[], dest: string, cut: boolean) => {
    if (busy || !sources.length) return
    setBusy(true)
    setFailure(null)
    try {
      await onTransfer(sources, dest, cut)
      setSelected([])
      await refresh()
      onChanged()
    } catch (reason) {
      setFailure(errorMessage(reason))
    } finally {
      setBusy(false)
    }
  }
  const transferActions = [
    { icon: 'copy', direction: 'arrow', label: labels.copyRight, sources: primarySources, dest: path, cut: false },
    { icon: 'cut', direction: 'arrow', label: labels.moveRight, sources: primarySources, dest: path, cut: true },
    { icon: 'copy', direction: 'back', label: labels.copyLeft, sources: selected, dest: primaryPath, cut: false },
    { icon: 'cut', direction: 'back', label: labels.moveLeft, sources: selected, dest: primaryPath, cut: true }
  ] as const
  return (
    <section
      className="secondary-pane"
      aria-label={labels.split}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (!(event.ctrlKey || event.metaKey) || (event.target as HTMLElement).closest('input, textarea')) return
        const key = event.key.toLowerCase()
        if (key === 'c' || key === 'x') {
          event.preventDefault()
          clipboard.setClipboard(key === 'c' ? 'copy' : 'cut', selected)
        }
        if (key === 'v') {
          event.preventDefault()
          void transfer(clipboard.paths, path, clipboard.mode === 'cut')
        }
        if (key === 'a') {
          event.preventDefault()
          setSelected(entries.filter((entry) => showHidden || !entry.hidden).map((entry) => entry.path))
        }
      }}
    >
      <div className="pane-transfer-rail" role="toolbar" aria-label={labels.split} aria-orientation="vertical">
        {transferActions.map((action, index) => (
          <div key={action.label}>
            {index === 2 && <span className="pane-transfer-rail__divider" />}
            <IconButton
              icon={action.icon}
              label={action.label}
              className="pane-transfer-action"
              disabled={busy || !action.sources.length || path === primaryPath}
              onClick={() => void transfer([...action.sources], action.dest, action.cut)}
            >
              <span className="pane-transfer-action__direction">
                <Icon name={action.direction} size={10} />
              </span>
            </IconButton>
          </div>
        ))}
      </div>
      <div className="workspace-pane">
        <PaneToolbar
          path={path}
          language={language}
          onNavigate={go}
          onUp={() =>
            void filesystem
              .getParent(path)
              .then(go)
              .catch((reason) => setFailure(errorMessage(reason)))
          }
          onRefresh={() => void refresh()}
        />
        <div className="workspace-pane__content">
          {(error || failure) && <p role="alert">{error ?? failure}</p>}
          {watchError && (
            <p role="status">
              {watchError} — {t('refresh')}
            </p>
          )}
          {loading ? (
            <p role="status">{t('loading')}</p>
          ) : (
            <FileTable
              rows={visibleEntries.map((entry) => ({ entry, tags: [], isSelected: selected.includes(entry.path), isActive: active === entry.path }))}
              currentPath={path}
              selectedPaths={selected}
              activePath={active}
              view={view}
              iconSize={iconSize}
              language={language}
              labels={{
                name: t('name'),
                modified: t('modified'),
                accessed: t('accessedField'),
                type: t('type'),
                size: t('size'),
                file: t('file'),
                fileType: t('fileType')
              }}
              folderLabel={t('folder')}
              showSize={showSize}
              folderSizes={folderSizes}
              onSelect={(event, entry) => {
                setActive(entry.path)
                setSelected(
                  event.ctrlKey || event.metaKey
                    ? selected.includes(entry.path)
                      ? selected.filter((item) => item !== entry.path)
                      : [...selected, entry.path]
                    : [entry.path]
                )
              }}
              onSelectPaths={setSelected}
              onFocusEntry={(entry) => setActive(entry.path)}
              onOpen={open}
              onContextMenu={(event) => event.preventDefault()}
              onBackgroundMenu={(event) => event.preventDefault()}
              onUnassign={() => {}}
              onDrop={(sources, dest, cut) => void transfer(sources, dest, cut)}
            />
          )}
        </div>
      </div>
    </section>
  )
}
