import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { STORAGE } from '../constants/storage'
import { OrganizerProvider, useOrganizer } from './organizer'

describe('quick access pins', () => {
  beforeEach(() => localStorage.clear())
  afterEach(cleanup)

  it('persists unpinned default folders and restores them when pinned again', () => {
    const first = renderHook(() => useOrganizer(), { wrapper: OrganizerProvider })
    act(() => first.result.current.removeQuickAccess('/home/user/Downloads'))
    expect(JSON.parse(localStorage.getItem(STORAGE.hiddenQuickAccess) || '[]')).toEqual(['/home/user/Downloads'])
    first.unmount()

    const second = renderHook(() => useOrganizer(), { wrapper: OrganizerProvider })
    expect(second.result.current.hiddenQuickAccess).toContain('/home/user/Downloads')
    act(() => second.result.current.addQuickAccess({ path: '/home/user/Downloads', name: 'Downloads' }))
    expect(second.result.current.hiddenQuickAccess).toEqual([])
    expect(second.result.current.quickAccess).toEqual([{ path: '/home/user/Downloads', name: 'Downloads' }])
  })

  it('removes custom pinned folders', () => {
    const { result } = renderHook(() => useOrganizer(), { wrapper: OrganizerProvider })
    act(() => result.current.addQuickAccess({ path: '/projects', name: 'Projects' }))
    act(() => result.current.removeQuickAccess('/projects'))
    expect(result.current.quickAccess).toEqual([])
  })
})
