import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { STORAGE } from '../constants/storage'
import { OrganizerProvider, pathsForSection, useOrganizer } from './organizer'

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

describe('tag sections', () => {
  beforeEach(() => localStorage.clear())
  afterEach(cleanup)

  it('matches any selected tag without duplicating paths', () => {
    expect(
      pathsForSection(
        { id: 'section', name: 'Work', tagIds: ['a', 'b'] },
        {
          '/z.pdf': ['a', 'b'],
          '/a.txt': ['b'],
          '/other.txt': ['c']
        }
      )
    ).toEqual(['/a.txt', '/z.pdf'])
  })

  it('persists, edits and removes sections without removing files or tags', () => {
    const first = renderHook(() => useOrganizer(), { wrapper: OrganizerProvider })
    let tagId = ''
    act(() => {
      tagId = first.result.current.createTag({ name: 'Work', color: '#ffffff', emoji: '📁' }).id
    })
    act(() => {
      first.result.current.assignTag('/report.pdf', tagId)
      first.result.current.saveTagSection({ name: ' Work ', tagIds: [tagId, tagId, 'missing'] })
    })
    expect(first.result.current.tagSections[0].tagIds).toEqual([tagId])
    first.unmount()
    const { result } = renderHook(() => useOrganizer(), { wrapper: OrganizerProvider })
    const section = result.current.tagSections[0]
    expect(section.name).toBe('Work')
    expect(pathsForSection(section, result.current.taggedPaths)).toEqual(['/report.pdf'])
    act(() => result.current.saveTagSection({ ...section, name: 'Reports' }))
    expect(result.current.tagSections).toHaveLength(1)
    expect(result.current.tagSections[0].name).toBe('Reports')
    act(() => result.current.removeTagSection(section.id))
    expect(result.current.tagSections).toEqual([])
    expect(result.current.taggedPaths['/report.pdf']).toEqual([tagId])
    expect(result.current.tags).toHaveLength(1)
  })

  it('updates section matches when tags are assigned, moved or removed', () => {
    const { result } = renderHook(() => useOrganizer(), { wrapper: OrganizerProvider })
    let tagId = ''
    act(() => {
      tagId = result.current.createTag({ name: 'Work', color: '#ffffff', emoji: '📁' }).id
    })
    act(() => result.current.saveTagSection({ name: 'Work', tagIds: [tagId] }))
    act(() => result.current.assignTag('/old.pdf', tagId))
    act(() => result.current.moveTag('/old.pdf', '/new.pdf'))
    expect(pathsForSection(result.current.tagSections[0], result.current.taggedPaths)).toEqual(['/new.pdf'])
    act(() => result.current.unassignTag('/new.pdf', tagId))
    expect(pathsForSection(result.current.tagSections[0], result.current.taggedPaths)).toEqual([])
    act(() => result.current.removeTag(tagId))
    expect(result.current.tagSections[0].tagIds).toEqual([])
  })
})
