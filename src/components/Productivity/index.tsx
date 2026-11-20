import { useId, useState } from 'react'
import type { Language } from '../../lib/preferences'
import { type SavedWorkspace, useProductivityStore, type VirtualFolder, type WorkspaceSnapshot } from '../../stores/productivityStore'
import { Button } from '../base/Button'
import { Dialog } from '../base/Dialog'
import { Icon } from '../base/Icon'
import { Switch } from '../base/Switch'
import { toolMessages } from '../FileTools/messages'
import { productivityMessages } from './messages'
import './styles.css'

type Props = {
  language: Language
  root: string
  query: string
  snapshot: () => WorkspaceSnapshot
  onWorkspace: (workspace: SavedWorkspace) => void
  onFolder: (folder: VirtualFolder) => void
  onClose: () => void
}

export function Productivity({ language, root, query, snapshot, onWorkspace, onFolder, onClose }: Props) {
  const l = productivityMessages(language)
  const titleId = useId()
  const store = useProductivityStore()
  const [workspaceName, setWorkspaceName] = useState('')
  const [folderName, setFolderName] = useState('')
  const [folderRoot, setFolderRoot] = useState(root)
  const [folderQuery, setFolderQuery] = useState(query)
  return (
    <Dialog backdropClass="productivity-backdrop" dismissLabel={l.title} onClose={onClose}>
      <section className="productivity-dialog" aria-labelledby={titleId}>
        <header className="productivity-header">
          <span className="productivity-header__icon">
            <Icon name="grid" size={22} />
          </span>
          <div>
            <h2 id={titleId}>{l.title}</h2>
            <p>{l.subtitle}</p>
          </div>
          <button type="button" className="productivity-close" aria-label={toolMessages(language).close} onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="productivity-content">
          <section className={`productivity-rehearsal${store.rehearsal ? ' is-enabled' : ''}`}>
            <span className="productivity-section__icon">
              <Icon name="check" size={20} />
            </span>
            <div>
              <div className="productivity-rehearsal__toggle">
                <strong id={`${titleId}-rehearsal`}>{l.rehearsal}</strong>
                <Switch
                  checked={store.rehearsal}
                  onChange={store.setRehearsal}
                  aria-labelledby={`${titleId}-rehearsal`}
                  aria-describedby={`${titleId}-rehearsal-help`}
                />
              </div>
              <p id={`${titleId}-rehearsal-help`}>{l.rehearsalHelp}</p>
            </div>
          </section>
          <div className="productivity-columns">
            <section className="productivity-section">
              <div className="productivity-section__heading">
                <span className="productivity-section__icon">
                  <Icon name="split" size={20} />
                </span>
                <h3>{l.workspaces}</h3>
                <span className="productivity-count">{store.workspaces.length}</span>
              </div>
              <p className="productivity-help">{l.workspaceHelp}</p>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  if (!workspaceName.trim()) return
                  store.saveWorkspace(workspaceName, snapshot())
                  setWorkspaceName('')
                }}
              >
                <label>
                  {l.name}
                  <input
                    value={workspaceName}
                    placeholder={l.workspacePlaceholder}
                    maxLength={100}
                    onChange={(event) => setWorkspaceName(event.target.value)}
                  />
                </label>
                <Button variant="primary" type="submit" disabled={!workspaceName.trim() || !root}>
                  <Icon name="plus" size={14} />
                  {l.saveWorkspace}
                </Button>
              </form>
              <div className="productivity-saved-heading">{l.savedWorkspaces}</div>
              {!store.workspaces.length && (
                <div className="productivity-empty">
                  <Icon name="split" size={24} />
                  <p>{l.emptyWorkspaces}</p>
                </div>
              )}
              <ul className="productivity-list" aria-label={l.savedWorkspaces}>
                {store.workspaces.map((item) => (
                  <li key={item.id}>
                    <span>
                      {item.name}
                      <small>
                        {item.snapshot.paths.length} {l.tabs} · {item.snapshot.paths[item.snapshot.activeIndex]}
                      </small>
                    </span>
                    <Button
                      aria-label={`${l.open}: ${item.name}`}
                      onClick={() => {
                        onWorkspace(item)
                        onClose()
                      }}
                    >
                      <Icon name="arrow" size={14} />
                      {l.open}
                    </Button>
                    <Button
                      variant="ghost"
                      className="productivity-remove"
                      title={l.remove}
                      aria-label={`${l.remove}: ${item.name}`}
                      onClick={() => store.removeWorkspace(item.id)}
                    >
                      <Icon name="trash" size={14} />
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
            <section className="productivity-section">
              <div className="productivity-section__heading">
                <span className="productivity-section__icon">
                  <Icon name="folder" size={20} />
                </span>
                <h3>{l.folders}</h3>
                <span className="productivity-count">{store.folders.length}</span>
              </div>
              <p className="productivity-help">{l.folderHelp}</p>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  store.saveFolder(folderName, folderRoot, folderQuery)
                  setFolderName('')
                }}
              >
                <label>
                  {l.name}
                  <input value={folderName} placeholder={l.folderPlaceholder} maxLength={100} onChange={(event) => setFolderName(event.target.value)} />
                </label>
                <label>
                  {l.root}
                  <input value={folderRoot} onChange={(event) => setFolderRoot(event.target.value)} />
                </label>
                <label>
                  {l.query}
                  <input value={folderQuery} placeholder="ext:pdf size:1mb" onChange={(event) => setFolderQuery(event.target.value)} />
                </label>
                <details className="productivity-rules">
                  <summary>{l.ruleHelp}</summary>
                  <p>{l.rules}</p>
                </details>
                <Button variant="primary" type="submit" disabled={!folderName.trim() || !folderRoot.trim() || !folderQuery.trim()}>
                  <Icon name="plus" size={14} />
                  {l.saveFolder}
                </Button>
              </form>
              <div className="productivity-saved-heading">{l.savedFolders}</div>
              {!store.folders.length && (
                <div className="productivity-empty">
                  <Icon name="folder" size={24} />
                  <p>{l.emptyFolders}</p>
                </div>
              )}
              <ul className="productivity-list" aria-label={l.savedFolders}>
                {store.folders.map((item) => (
                  <li key={item.id}>
                    <span>
                      {item.name}
                      <small>
                        {item.root} · {item.query}
                      </small>
                    </span>
                    <Button
                      aria-label={`${l.open}: ${item.name}`}
                      onClick={() => {
                        onFolder(item)
                        onClose()
                      }}
                    >
                      <Icon name="arrow" size={14} />
                      {l.open}
                    </Button>
                    <Button
                      variant="ghost"
                      className="productivity-remove"
                      title={l.remove}
                      aria-label={`${l.remove}: ${item.name}`}
                      onClick={() => store.removeFolder(item.id)}
                    >
                      <Icon name="trash" size={14} />
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
        <footer className="productivity-footer">
          <span className="productivity-footer__hint">
            <Icon name="info" size={14} />
            {l.safeOrganization}
          </span>
          <Button variant="ghost" onClick={onClose}>
            {toolMessages(language).close}
          </Button>
        </footer>
      </section>
    </Dialog>
  )
}
