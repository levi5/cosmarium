import { afterEach, describe, expect, it } from 'vitest'
import type { Volume } from '../types/explorer'
import { driveLabel, updateAlias, useDriveAliasStore } from './driveAliasStore'

const volume: Volume = { name: '/dev/nvme0n1p2', mount_point: '/media/data', total_space: 100, available_space: 50 }
afterEach(() => {
  useDriveAliasStore.setState({ aliases: {} })
  localStorage.clear()
})

describe('drive nicknames', () => {
  it('changes only the display label, without mutating the volume', () => {
    const aliases = updateAlias({}, volume.mount_point, '  Meus arquivos  ')
    expect(driveLabel(volume, aliases)).toBe('Meus arquivos')
    expect(volume.name).toBe('/dev/nvme0n1p2')
    expect(volume.mount_point).toBe('/media/data')
  })

  it('restores the original label when cleared and preserves other aliases', () => {
    const aliases = { '/media/data': 'Dados', '/media/backup': 'Backup' }
    const next = updateAlias(aliases, volume.mount_point, '  ')
    expect(driveLabel(volume, next)).toBe(volume.name)
    expect(next).toEqual({ '/media/backup': 'Backup' })
    expect(aliases['/media/data']).toBe('Dados')
    expect(driveLabel({ ...volume, name: '' }, next)).toBe(volume.mount_point)
  })

  it('persists aliases and restores them after rehydration', async () => {
    useDriveAliasStore.getState().setAlias(volume.mount_point, 'Dados')
    const persisted = localStorage.getItem('cosmarium.drive-aliases')
    expect(persisted).toContain('Dados')
    useDriveAliasStore.setState({ aliases: {} })
    localStorage.setItem('cosmarium.drive-aliases', persisted ?? '')
    await useDriveAliasStore.persist.rehydrate()
    expect(driveLabel(volume, useDriveAliasStore.getState().aliases)).toBe('Dados')
  })
})
