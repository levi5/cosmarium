import { errorMessage } from '../lib/format'
import { useTransferStore } from '../stores/transferStore'
import type { ConflictResolution } from '../types/explorer'
import { filesystem } from './tauri/filesystem'

export async function transferEntries(id: string, sources: string[], dest: string, cut: boolean, resolutions: ConflictResolution[]) {
  const store = useTransferStore.getState()
  store.enqueue(id, cut)
  try {
    const summary = await filesystem.transferEntries(id, sources, dest, cut, resolutions)
    store.finish(id, summary.errors.join('\n') || null, summary.cancelled)
    return summary
  } catch (reason) {
    store.finish(id, errorMessage(reason))
    throw reason
  }
}
