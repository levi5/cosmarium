import { useFileWorkspace } from '../../lib/files'
import { useSelectionStore } from '../../stores/selectionStore'
import './styles.css'

export function StatusBar() {
  const { entries } = useFileWorkspace()
  const { selected } = useSelectionStore()
  return (
    <footer className="status-bar">
      <span>{entries.length} items</span>
      {selected.length > 0 && (
        <>
          <span className="status-bar__divider" />
          <span>
            {selected.length} item{selected.length === 1 ? '' : 's'} selected
          </span>
        </>
      )}
    </footer>
  )
}
