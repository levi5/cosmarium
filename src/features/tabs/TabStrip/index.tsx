import { useEffect, useRef, useState } from 'react'
import { ContextMenu } from '../../../components/base/ContextMenu'
import { Icon } from '../../../components/base/Icon'
import { FileIcon } from '../../../components/FileIcon'
import { getDragPayload, isInternalDrag, markDropTarget } from '../../../lib/dnd'
import { useFileWorkspace } from '../../../lib/files'
import { createTranslator } from '../../../lib/i18n'
import { usePreferences } from '../../../lib/preferences'
import { useExplorerStore } from '../../../stores/explorerStore'
import { usePendingDropStore } from '../../../stores/pendingDropStore'
import '../../../components/FileIcon/styles.css'
import './styles.css'

const DRAG_THRESHOLD_PX = 4

type TabMenu = { anchorX: number; anchorY: number; id: string }

export function TabStrip() {
  const { language } = usePreferences()
  const translateText = createTranslator(language)
  const { tabs, activeTabId, setActiveTab, closeTab, createTab, duplicateTab, reorderTabs } = useExplorerStore()
  const { currentPath, locations } = useFileWorkspace()
  const [dragging, setDragging] = useState<number | null>(null)
  const [dropTarget, setDropTarget] = useState<number | null>(null)
  const [fileDropPath, setFileDropPath] = useState<string | null>(null)
  const [menu, setMenu] = useState<TabMenu | null>(null)
  const requestDrop = usePendingDropStore((state) => state.request)
  const listRef = useRef<HTMLDivElement>(null)
  const pointer = useRef<{ index: number; startX: number; active: boolean } | null>(null)
  const dropTargetRef = useRef<number | null>(null)

  const indexAtX = (clientX: number) => {
    const nodes = Array.from(listRef.current?.children ?? []) as HTMLElement[]
    if (nodes.length === 0) return 0
    const halfCenterIndex = nodes.findIndex((node) => {
      const bounds = node.getBoundingClientRect()
      return clientX < bounds.left + bounds.width / 2
    })
    return halfCenterIndex === -1 ? nodes.length - 1 : halfCenterIndex
  }

  useEffect(() => {
    const release = () => {
      if (!pointer.current) return
      pointer.current = null
      dropTargetRef.current = null
      setDragging(null)
      setDropTarget(null)
    }
    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', release)
    window.addEventListener('blur', release)
    return () => {
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', release)
      window.removeEventListener('blur', release)
    }
  }, [])

  const onPointerDown = (event: React.PointerEvent, index: number) => {
    if (event.button !== 0) return
    if ((event.target as HTMLElement).closest('button')) return
    pointer.current = { index, startX: event.clientX, active: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: React.PointerEvent) => {
    const state = pointer.current
    if (!state) return
    if (!state.active) {
      if (Math.abs(event.clientX - state.startX) < DRAG_THRESHOLD_PX) return
      state.active = true
      setDragging(state.index)
    }
    dropTargetRef.current = indexAtX(event.clientX)
    setDropTarget(dropTargetRef.current)
  }

  const endPointerDrag = (commit: boolean) => {
    const state = pointer.current
    const target = dropTargetRef.current
    pointer.current = null
    dropTargetRef.current = null
    if (state?.active && commit && target !== null) reorderTabs(state.index, target)
    setDragging(null)
    setDropTarget(null)
  }

  return (
    <div className="tab-strip">
      <div
        className="tab-strip__tabs"
        role="tablist"
        ref={listRef}
        onPointerMove={onPointerMove}
        onPointerUp={() => endPointerDrag(true)}
        onPointerCancel={() => endPointerDrag(false)}
      >
        {tabs.map((tab, index) => (
          <div
            role="tab"
            key={tab.id}
            aria-selected={tab.id === activeTabId}
            tabIndex={tab.id === activeTabId ? 0 : -1}
            className={`app-tab ${tab.id === activeTabId ? 'is-active' : ''} ${dragging === index ? 'is-dragging' : ''} ${dropTarget === index && dragging !== index ? 'is-drop-target' : ''} ${fileDropPath === tab.path ? 'is-file-drop' : ''}`}
            onPointerDown={(event) => onPointerDown(event, index)}
            onClick={() => {
              if (pointer.current?.active) return
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
