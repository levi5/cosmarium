import { useState } from 'react'
import { getDragPayload, isInternalDrag, markDropTarget } from '../../lib/dnd'
import { useFileWorkspace } from '../../lib/files'
import { createTranslator } from '../../lib/i18n'
import { usePreferences } from '../../lib/preferences'
import { useExplorerStore } from '../../stores/explorerStore'
import { usePendingDropStore } from '../../stores/pendingDropStore'
import { ContextMenu } from '../base/ContextMenu'
import { Icon } from '../base/Icon'
import { FileIcon } from '../FileIcon'
import { useTabDrag } from './useTabDrag'
import '../FileIcon/styles.css'
import './styles.css'

type TabMenu = { anchorX: number; anchorY: number; id: string }

export function TabStrip() {
  const { language } = usePreferences()
  const translateText = createTranslator(language)
  const { tabs, activeTabId, setActiveTab, closeTab, createTab, duplicateTab, reorderTabs } = useExplorerStore()
  const { currentPath, locations } = useFileWorkspace()
  const tabDrag = useTabDrag(
    tabs.map((tab) => tab.id),
    reorderTabs
  )
  const [fileDropPath, setFileDropPath] = useState<string | null>(null)
  const [menu, setMenu] = useState<TabMenu | null>(null)
  const requestDrop = usePendingDropStore((state) => state.request)

  return (
    <div className="tab-strip">
      <div
        className={`tab-strip__tabs ${tabDrag.dragging !== null ? 'is-reordering' : ''}`}
        role="tablist"
        ref={tabDrag.listRef}
        onPointerMove={tabDrag.onPointerMove}
        onPointerUp={tabDrag.onPointerUp}
        onPointerCancel={tabDrag.onPointerCancel}
        onLostPointerCapture={tabDrag.onPointerCancel}
      >
        {tabs.map((tab, index) => (
          <div
            role="tab"
            key={tab.id}
            aria-selected={tab.id === activeTabId}
            tabIndex={tab.id === activeTabId ? 0 : -1}
            className={`app-tab ${tab.id === activeTabId ? 'is-active' : ''} ${tabDrag.dragging === index ? 'is-dragging' : ''} ${fileDropPath === tab.path ? 'is-file-drop' : ''}`}
            style={tabDrag.styleFor(index)}
            data-native-drop-path={locations?.trash !== locations?.home && tab.path === locations?.trash ? undefined : tab.path}
            onPointerDown={(event) => tabDrag.onPointerDown(event, index)}
            onClick={() => {
              if (tabDrag.consumeClick()) return
              setActiveTab(tab.id)
            }}
            onContextMenu={(event) => {
              event.preventDefault()
              setMenu({ anchorX: event.clientX, anchorY: event.clientY, id: tab.id })
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setActiveTab(tab.id)
              }
            }}
            onDragOver={(event) => {
              if (isInternalDrag(event)) {
                if (tab.path === currentPath) return
                event.preventDefault()
                markDropTarget(event, true)
                if (fileDropPath !== tab.path) setFileDropPath(tab.path)
                return
              }
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
            }}
            onDragLeave={() => {
              if (fileDropPath === tab.path) setFileDropPath(null)
            }}
            onDrop={(event) => {
              const payload = getDragPayload(event)
              setFileDropPath(null)
              if (!payload) return
              if (tab.path === currentPath) return
              event.preventDefault()
              requestDrop({ paths: payload.paths, dest: tab.path, cut: !payload.copy })
            }}
          >
            <FileIcon entry={{ name: tab.title, kind: 'directory' }} size="small" />
            <span>{tab.title}</span>
            {tabs.length > 1 && (
              <button
                type="button"
                className="app-tab__close"
                aria-label={translateText('closeTab')}
                title={translateText('closeTab')}
                onClick={(event) => {
                  event.stopPropagation()
                  closeTab(tab.id)
                }}
              >
                <Icon name="close" size={11} />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        className="new-tab"
        onClick={() => createTab(currentPath || locations?.home || '')}
        aria-label={translateText('newTab')}
        title={translateText('newTab')}
      >
        <Icon name="plus" size={16} />
      </button>
      {menu && (
        <ContextMenu anchorX={menu.anchorX} anchorY={menu.anchorY} onClose={() => setMenu(null)}>
          <button
            type="button"
            className="dropdown__item"
            onClick={() => {
              duplicateTab(menu.id)
              setMenu(null)
            }}
          >
            {translateText('duplicateTab')}
          </button>
          <button
            type="button"
            className="dropdown__item"
            onClick={() => {
              closeTab(menu.id)
              setMenu(null)
            }}
          >
            {translateText('closeTab')}
          </button>
        </ContextMenu>
      )}
    </div>
  )
}
