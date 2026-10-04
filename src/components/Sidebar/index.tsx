import { listen } from '@tauri-apps/api/event'
import { useCallback, useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Icon } from '../base/Icon'
import { ConfirmDialog } from '../ConfirmDialog'
import { FileIcon } from '../FileIcon'
import '../FileIcon/styles.css'
import { getDragPayload, isInternalDrag, markDropTarget } from '../../lib/dnd'
import { useFileWorkspace } from '../../lib/files'
import { errorMessage } from '../../lib/format'
import { createTranslator, type TranslationKey } from '../../lib/i18n'
import { useOrganizer } from '../../lib/organizer'
import { usePreferences } from '../../lib/preferences'
import { filesystem } from '../../services/tauri/filesystem'
import { usePendingDropStore } from '../../stores/pendingDropStore'
import './styles.css'

const locations = [
  ['drive', 'desktop', 'desktop'],
  ['download', 'downloads', 'downloads'],
  ['file', 'documents', 'documents'],
  ['image', 'pictures', 'pictures'],
  ['music', 'music', 'music'],
  ['video', 'videos', 'videos']
] as const

export function Sidebar() {
  const { language } = usePreferences()
  const { locations: systemLocations, volumes, currentPath, navigateTo, refresh } = useFileWorkspace()
  const { quickAccess: pinnedItems } = useOrganizer()
  const navigate = useNavigate()
  const translateText = createTranslator(language)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [dropPath, setDropPath] = useState<string | null>(null)
  const [trashCount, setTrashCount] = useState(0)
  const [emptyTrashOpen, setEmptyTrashOpen] = useState(false)
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null)
  const requestDrop = usePendingDropStore((state) => state.request)

  const loadTrashCount = useCallback(() => {
    filesystem
      .trashCount()
      .then(setTrashCount)
      .catch(() => setTrashCount(0))
  }, [])

  useEffect(() => {
    let cancelled = false
    let unlisten: (() => void) | undefined
    loadTrashCount()
    listen<string>('cosmarium://fs-changed', () => {
      if (!cancelled) loadTrashCount()
    })
      .then((off) => {
        if (cancelled) off()
        else unlisten = off
      })
      .catch(() => {})
    return () => {
      cancelled = true
      unlisten?.()
    }
  }, [loadTrashCount])

  const handleEmptyTrash = async () => {
    setEmptyTrashOpen(false)
    try {
      await filesystem.emptyTrash()
      loadTrashCount()
      void refresh()
    } catch (reason) {
      setNotice({ title: translateText('emptyTrashTitle'), message: errorMessage(reason) })
      loadTrashCount()
      void refresh()
    }
  }

  const openPath = (path: string) => {
    navigate('/')
    navigateTo(path)
  }
  const openLocation = (location: keyof NonNullable<typeof systemLocations>) => {
    if (systemLocations) openPath(systemLocations[location])
  }
  const toggle = (key: string) => setCollapsed((current) => ({ ...current, [key]: !current[key] }))
  const classFor = (path: string | undefined) => `nav-item ${currentPath === path ? 'active' : ''} ${dropPath === path ? 'is-drop-target' : ''}`

  const dropProps = (path: string | undefined) =>
    path
      ? {
          onDragOver: (event: React.DragEvent) => {
            if (!isInternalDrag(event) || path === currentPath) return
            event.preventDefault()
            markDropTarget(event, true)
            if (dropPath !== path) setDropPath(path)
          },
          onDragLeave: () => {
            if (dropPath === path) setDropPath(null)
          },
          onDrop: (event: React.DragEvent) => {
            if (!path || path === currentPath) return
            const payload = getDragPayload(event)
            setDropPath(null)
            if (!payload) return
            event.preventDefault()
            requestDrop({ paths: payload.paths, dest: path, cut: !payload.copy })
          }
        }
      : {}

  const section = (key: string, label: TranslationKey, children: React.ReactNode) => (
    <div className="nav-section">
      <button type="button" className="nav-heading" aria-expanded={!collapsed[key]} onClick={() => toggle(key)}>
        <span className="nav-heading__label">{translateText(label)}</span>
        <Icon name="chevronDown" size={12} />
      </button>
      {!collapsed[key] && <div className="nav-section__items">{children}</div>}
    </div>
  )

  return (
    <aside className="sidebar">
      <nav>
        <NavLink className={() => classFor(systemLocations?.home)} to="/" end onClick={() => systemLocations && navigateTo(systemLocations.home)}>
          <span className="nav-icon">
            <Icon name="home" size={16} />
          </span>
          <span className="nav-item__label">{translateText('home')}</span>
        </NavLink>
        {locations.map(([icon, label, location]) => (
          <button
            type="button"
            className={classFor(systemLocations?.[location])}
            key={label}
            onClick={() => openLocation(location)}
            {...dropProps(systemLocations?.[location])}
          >
            <span className="nav-icon">
              <Icon name={icon} size={16} />
            </span>
            <span className="nav-item__label">{translateText(label)}</span>
          </button>
        ))}

        {pinnedItems.length > 0 &&
          section(
            'pinned',
            'pinned',
            pinnedItems.map((item) => (
              <button type="button" className={classFor(item.path)} key={item.path} onClick={() => openPath(item.path)} {...dropProps(item.path)}>
                <span className="nav-icon nav-icon--folder">
                  <FileIcon entry={{ name: item.name, kind: 'directory' }} size="small" />
                </span>
                <span className="nav-item__label">{item.name}</span>
              </button>
            ))
          )}

        {section(
          'drives',
          'drives',
          volumes.map((volume) => (
            <button
              type="button"
              className={classFor(volume.mount_point)}
              key={volume.mount_point}
              onClick={() => openPath(volume.mount_point)}
              {...dropProps(volume.mount_point)}
            >
              <span className="nav-icon">
                <Icon name="drive" size={16} />
              </span>
              <span className="nav-item__label">{volume.name || volume.mount_point}</span>
            </button>
          ))
        )}

        {section(
          'storage',
          'storage',
          <div className="nav-item-row">
            <button type="button" className={classFor(systemLocations?.trash)} onClick={() => openLocation('trash')}>
              <span className="nav-icon">
                <Icon name="trash" size={16} />
              </span>
              <span className="nav-item__label">{translateText('trash')}</span>
            </button>
            <button
              type="button"
              className="nav-item-action"
              aria-label={translateText('emptyTrash')}
              title={translateText('emptyTrash')}
              disabled={!trashCount}
              onClick={() => {
                if (trashCount) setEmptyTrashOpen(true)
              }}
            >
              <Icon name="broom" size={14} />
            </button>
          </div>
        )}
        {emptyTrashOpen && (
          <ConfirmDialog
            title={translateText('emptyTrashTitle')}
            message={translateText('emptyTrashMessage').replace('{count}', String(trashCount))}
            confirmLabel={translateText('emptyTrash')}
            cancelLabel={translateText('cancel')}
            danger
            onConfirm={() => void handleEmptyTrash()}
            onClose={() => setEmptyTrashOpen(false)}
          />
        )}
        {notice && (
          <ConfirmDialog
            title={notice.title}
            message={notice.message}
            confirmLabel={translateText('ok')}
            cancelLabel={translateText('cancel')}
            hideCancel
            onConfirm={() => setNotice(null)}
            onClose={() => setNotice(null)}
          />
        )}
      </nav>
    </aside>
  )
}
