import { create } from 'zustand'
import { errorMessage } from '../lib/format'
import { createTranslator } from '../lib/i18n'
import type { Language } from '../lib/preferences'
import { filesystem } from '../services/tauri/filesystem'
import type { UndoStep } from '../types/explorer'

type UndoToast = { text: string; tone: 'ok' | 'error' }

type UndoState = {
  toast: UndoToast | null
  dismiss: () => void
  run: (language: Language) => Promise<void>
}

function describeStep(step: UndoStep, language: Language): string {
  const translateText = createTranslator(language)
  switch (step.kind) {
    case 'rename':
      return translateText('undoDone')
    case 'clear':
      return translateText('undoDone')
    default:
      return translateText('restoreDone').replace('{count}', String(step.count))
  }
}

let timer: number | null = null

export const useUndoStore = create<UndoState>((set) => ({
  toast: null,
  dismiss: () => set({ toast: null }),
  run: async (language) => {
    const translateText = createTranslator(language)
    try {
      const step = await filesystem.undoLast()
      set({ toast: { text: describeStep(step, language), tone: 'ok' } })
    } catch (reason) {
      const message = errorMessage(reason)
      const text = message === 'Nothing to undo.' ? translateText('undoNone') : `${translateText('error')}: ${message}`
      set({ toast: { text, tone: 'error' } })
    }
    if (timer) window.clearTimeout(timer)
    timer = window.setTimeout(() => set({ toast: null }), 4000)
  }
}))
