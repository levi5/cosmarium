import { useCallback, useRef, useState } from 'react'
import { errorMessage } from '../../lib/format'

export function useTask() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const running = useRef(false)
  const run = useCallback(async (task: () => Promise<void>) => {
    if (running.current) return
    running.current = true
    setBusy(true)
    setError(null)
    try {
      await task()
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      running.current = false
      setBusy(false)
    }
  }, [])
  return { busy, error, run }
}
