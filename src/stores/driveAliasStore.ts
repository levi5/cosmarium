import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Volume } from '../types/explorer'

type DriveAliasState = {
  aliases: Record<string, string>
  setAlias: (path: string, value: string) => void
}

export function driveLabel(volume: Volume, aliases: Record<string, string>): string {
  return aliases[volume.mount_point] || volume.name || volume.mount_point
}

export function updateAlias(aliases: Record<string, string>, path: string, value: string): Record<string, string> {
  const next = { ...aliases }
  const alias = value.trim().slice(0, 128)
  delete next[path]
  return alias ? { ...next, [path]: alias } : next
}

export const useDriveAliasStore = create<DriveAliasState>()(
  persist(
    (set) => ({
      aliases: {},
      setAlias: (path, value) => set((state) => ({ aliases: updateAlias(state.aliases, path, value) }))
    }),
    {
      name: 'cosmarium.drive-aliases',
      partialize: (state) => ({ aliases: state.aliases })
    }
  )
)
