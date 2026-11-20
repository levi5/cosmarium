// Runs only in the isolated capture browser, never in the shipped application.
// Every path, name and byte of preview content is fictional; no disk access.
export function installScreenshotFixture(language, theme) {
  const en = language === 'en'
  const home = 'C:\\Users\\demo'
  const folder = `${home}\\${en ? 'Projects' : 'Projetos'}`
  const names = en
    ? ['Project Aurora', 'Orbit Studio', 'References', 'demo-ideas.md', 'aurora-guide.pdf', 'demo-cover.png', 'demo-soundtrack.mp3']
    : ['Projeto Aurora', 'Estúdio Órbita', 'Referências', 'ideias-demo.md', 'guia-aurora.pdf', 'capa-demo.png', 'trilha-demo.mp3']
  const entries = names.map((name, index) => ({
    name,
    path: `${folder}\\${name}`,
    kind: index < 3 ? 'directory' : 'file',
    size: [0, 0, 0, 4096, 1887436, 2516582, 6396313][index],
    modified: Date.UTC(2026, 10, 18, 15, 42) / 1000,
    accessed: null,
    hidden: false
  }))
  localStorage.clear()
  const preferences = {
    theme, language, material: 'solid', 'file-view': 'list', 'details-pane': 'true',
    'show-recent': 'false', 'remember-last-location': 'true'
  }
  for (const [key, value] of Object.entries(preferences)) localStorage.setItem(`cosmarium-${key}`, value)
  const tabs = [home, folder].map((path, index) => ({
    id: `demo-${index}`, title: index ? (en ? 'Projects' : 'Projetos') : (en ? 'Home' : 'Início'),
    path, history: [path], historyIndex: 0
  }))
  localStorage.setItem('cosmarium-explorer-tabs', JSON.stringify({
    state: { tabs, activeTabId: 'demo-1', closedTabs: [] }, version: 0
  }))
  let callbackId = 0
  window.__TAURI_INTERNALS__ = {
    metadata: { currentWindow: { label: 'main' }, currentWebview: { label: 'main' } },
    transformCallback: () => ++callbackId,
    unregisterCallback: () => {},
    invoke: async (command, args = {}) => {
      switch (command) {
        case 'get_locations': return {
          home, desktop: `${home}\\Desktop`, downloads: `${home}\\Downloads`,
          documents: `${home}\\Documents`, pictures: `${home}\\Pictures`,
          music: `${home}\\Music`, videos: `${home}\\Videos`, trash: 'trash://'
        }
        case 'get_volumes': return [{
          name: en ? 'Demo disk' : 'Disco de exemplo', mount_point: 'C:\\',
          total_space: 512 * 1024 ** 3, available_space: 320 * 1024 ** 3
        }]
        case 'list_directory': return entries
        case 'take_startup_path': return null
        case 'trash_count': return 0
        case 'recent_entries': return []
        case 'get_folder_sizes': return Object.fromEntries((args.paths ?? []).map(path => [
          path, { size: 24 * 1024 ** 2, files: 8, dirs: 2, truncated: false }
        ]))
        case 'get_folder_stats': return { size: 24 * 1024 ** 2, files: 8, dirs: 2, truncated: false }
        case 'read_text_preview': return { text: '', truncated: false, isText: false, size: 0 }
        case 'watch_directory':
        case 'unwatch_directory': return null
        case 'plugin:event|listen': return ++callbackId
        case 'plugin:event|unlisten': return null
        case 'plugin:window|is_maximized':
        case 'plugin:window|is_fullscreen': return false
        default: throw new Error(`Screenshot fixture blocks native command: ${command}`)
      }
    }
  }
  window.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener: () => {} }
}
